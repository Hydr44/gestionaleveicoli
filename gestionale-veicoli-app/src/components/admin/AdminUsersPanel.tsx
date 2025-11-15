import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { supabase } from '../../lib/supabaseClient';
import { ConfirmDialog } from '../ConfirmDialog';

type AdminUsersPanelProps = {
  isAdmin: boolean;
  currentUserId?: string | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
};

type CreateForm = {
  username: string;
  displayName: string;
  password: string;
  newPassword: string;
  role: 'admin' | 'operatore' | 'solo_lettura';
};

const defaultForm: CreateForm = {
  username: '',
  displayName: '',
  password: '',
  newPassword: '',
  role: 'operatore',
};

const DEFAULT_ACCOUNT = {
  username: 'scozzarini',
  password: 'ChangeMeSubito!',
  displayName: 'Scozzarini Service Car',
  role: 'admin' as const,
};

export function AdminUsersPanel({ isAdmin, currentUserId, showToast }: AdminUsersPanelProps) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [_deleting, setDeleting] = useState(false); // Usato per gestire lo stato di eliminazione
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultEnsured, setDefaultEnsured] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => a.username?.localeCompare(b.username ?? '') ?? 0);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return sortedProfiles;
    const value = search.trim().toLowerCase();
    return sortedProfiles.filter((profile) => {
      const username = profile.username?.toLowerCase() ?? '';
      const displayName = profile.display_name?.toLowerCase() ?? '';
      const role = profile.role.toLowerCase();
      return (
        username.includes(value) ||
        displayName.includes(value) ||
        role.includes(value)
      );
    });
  }, [sortedProfiles, search]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter((p) => p.role === 'admin').length;
    const operators = profiles.filter((p) => p.role === 'operatore').length;
    const readonly = profiles.filter((p) => p.role === 'solo_lettura').length;
    return { total, admins, operators, readonly };
  }, [profiles]);

  const fetchProfiles = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    const { data, error: supaError } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, created_at')
      .order('created_at', { ascending: true });
    if (supaError) {
      setError(supaError.message);
    } else {
      setProfiles(data as ProfileRow[]);
    }
    setLoading(false);
    setInitialLoadDone(true);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin, fetchProfiles]);

  useEffect(() => {
    if (!isAdmin || defaultEnsured || !initialLoadDone) return;
    const hasDefault = profiles.some(
      (profile) => profile.username?.toLowerCase() === DEFAULT_ACCOUNT.username
    );
    if (!hasDefault) {
      (async () => {
        try {
          await invoke('create_supabase_user', {
            payload: {
              username: DEFAULT_ACCOUNT.username,
              password: DEFAULT_ACCOUNT.password,
              displayName: DEFAULT_ACCOUNT.displayName,
              role: DEFAULT_ACCOUNT.role,
            },
          });
          await fetchProfiles();
        } catch (err) {
          console.warn('Impossibile creare account di default:', err);
        } finally {
          setDefaultEnsured(true);
        }
      })();
    } else {
      setDefaultEnsured(true);
    }
  }, [isAdmin, defaultEnsured, initialLoadDone, profiles, fetchProfiles]);

  const handleChange = (field: keyof CreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const username = form.username.trim().toLowerCase();
    const displayName = form.displayName.trim() || null;

    try {
      if (editingId) {
        await invoke('update_supabase_user', {
          payload: {
            id: editingId,
            displayName,
            role: form.role,
            password: form.newPassword.trim() || null,
          },
        });
      } else {
        if (!username || !form.password.trim()) {
          setFormError('Inserisci username e password.');
          setSubmitting(false);
          return;
        }
        await invoke('create_supabase_user', {
          payload: {
            username,
            password: form.password.trim(),
            displayName,
            role: form.role,
          },
        });
      }

      await fetchProfiles();
      setForm(defaultForm);
      setEditingId(null);
      showToast(
        editingId ? 'Utente modificato con successo' : 'Utente creato con successo',
        'success'
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Errore inatteso durante la creazione/modifica utente.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (profile: ProfileRow) => {
    setEditingId(profile.id);
    const allowedRoles: CreateForm['role'][] = ['admin', 'operatore', 'solo_lettura'];
    const roleCandidate = profile.role.toLowerCase();
    setForm({
      username: profile.username ?? '',
      displayName: profile.display_name ?? '',
      password: '',
      newPassword: '',
      role: (allowedRoles.includes(roleCandidate as CreateForm['role'])
        ? (roleCandidate as CreateForm['role'])
        : 'operatore'),
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
  };

  const handleDelete = (profile: ProfileRow) => {
    const username = profile.username ?? 'utente';
    setConfirmDialog({
      open: true,
      title: 'Conferma eliminazione utente',
      message: `Sei sicuro di voler eliminare l'account "${username}"? L'operazione è irreversibile.`,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        (async () => {
          setDeleting(true);
          try {
            await invoke('delete_supabase_user', { payload: { id: profile.id } });
            await fetchProfiles();
            if (editingId === profile.id) {
              handleCancelEdit();
            }
            showToast('Utente eliminato con successo', 'success');
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : typeof err === 'string'
                ? err
                : 'Errore inatteso durante l\'eliminazione.';
            setFormError(message);
            showToast(message, 'error');
          } finally {
            setDeleting(false);
          }
        })();
      },
    });
  };

  if (!isAdmin) {
    return (
      <section className="card admin-panel">
        <h2>Gestione operatori</h2>
        <p>
          Solo gli amministratori possono creare o modificare gli operatori.
          Chiedi supporto a un admin per abilitare nuovi account o resettare una password.
        </p>
      </section>
    );
  }

  return (
    <section className="card admin-panel">
      <h2>Gestione operatori</h2>
      <p>Gli account creati verranno sincronizzati con Supabase automaticamente.</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-header">
          <div>
            <span className="badge">{editingId ? 'Modifica operatore' : 'Crea operatore'}</span>
            <h3>{editingId ? 'Modifica account interno' : 'Nuovo account interno'}</h3>
            <p>
              {editingId
                ? 'Aggiorna i dati di profilo e il ruolo. La password è opzionale.'
                : 'Inserisci le credenziali iniziali. L’utente riceverà accesso immediato e potrà cambiare password al primo login.'}
            </p>
          </div>
          {editingId && (
            <button type="button" className="secondary ghost small" onClick={handleCancelEdit}>
              Annulla modifica
            </button>
          )}
        </div>
        <div className="admin-grid">
          <label>
            <span>Username</span>
            <input
              type="text"
              value={form.username}
              onChange={(event) => handleChange('username', event.target.value)}
              placeholder="es. scozzarini"
              required
              disabled={Boolean(editingId)}
            />
          </label>
          <label>
            <span>Nome visibile</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) => handleChange('displayName', event.target.value)}
              placeholder="Nome e cognome"
            />
          </label>
          {!editingId && (
            <label>
              <span>Password iniziale</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => handleChange('password', event.target.value)}
                placeholder="Password temporanea"
                required
              />
            </label>
          )}
          {editingId && (
            <label>
              <span>Nuova password (opzionale)</span>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => handleChange('newPassword', event.target.value)}
                placeholder="Lascia vuoto per non cambiare"
              />
            </label>
          )}
          <label>
            <span>Ruolo</span>
            <div className="select-wrapper">
              <select
                value={form.role}
                onChange={(event) => handleChange('role', event.target.value)}
              >
                <option value="operatore">Operatore</option>
                <option value="solo_lettura">Solo lettura</option>
                <option value="admin">Amministratore</option>
              </select>
              <span className="chevron">▾</span>
            </div>
          </label>
        </div>
        {formError && <p className="form-error">{formError}</p>}
        <div className="form-actions">
          <button type="submit" className={`primary ${submitting ? 'loading' : ''}`} disabled={submitting}>
            {submitting
              ? editingId
                ? 'Aggiornamento…'
                : 'Creazione in corso…'
              : editingId
              ? 'Salva modifiche'
              : 'Crea account'}
          </button>
        </div>
      </form>

      <hr className="admin-divider" />

      <div className="admin-users-list">
        <h3>Operatori registrati</h3>
        <div className="admin-stats">
          <div className="admin-stat-card highlight">
            <span className="label">Totale</span>
            <span className="value">{stats.total}</span>
          </div>
          <div className="admin-stat-card">
            <span className="label">Admin</span>
            <span className="value">{stats.admins}</span>
          </div>
          <div className="admin-stat-card">
            <span className="label">Operativi</span>
            <span className="value">{stats.operators}</span>
          </div>
          <div className="admin-stat-card">
            <span className="label">Solo lettura</span>
            <span className="value">{stats.readonly}</span>
          </div>
        </div>
        <label className="admin-search">
          <input
            type="search"
            placeholder="Cerca per nome, username o ruolo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {loading ? (
          <div className="cases-spinner">
            <div className="spinner" />
            <p>Caricamento utenti…</p>
          </div>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : filteredProfiles.length === 0 ? (
          <p className="empty-state">Nessun operatore registrato.</p>
        ) : (
          <div className="admin-card-grid">
            {filteredProfiles.map((profile) => {
              const source = (profile.display_name || profile.username || '??').trim();
              const initials = source
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part.charAt(0))
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const isCurrentUser = profile.id === currentUserId;
              return (
                <div className={`admin-user-card ${isCurrentUser ? 'current-user' : ''}`} key={profile.id}>
                  <div className="avatar">{initials || '??'}</div>
                  <div className="body">
                    <div className="header">
                      <div>
                        <span className="title">{profile.display_name ?? '—'}</span>
                        {isCurrentUser && (
                          <span className="current-user-badge">Tu</span>
                        )}
                      </div>
                      <span className={`role-chip role-${profile.role}`}>{profile.role}</span>
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary small"
                          onClick={() => handleEdit(profile)}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          className="danger small"
                          onClick={() => handleDelete(profile)}
                          disabled={isCurrentUser}
                          title={isCurrentUser ? 'Non puoi eliminare il tuo account' : ''}
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                    <p className="subtitle">@{profile.username ?? '—'}</p>
                    {isCurrentUser && (
                      <p className="current-user-note">Questo è il tuo account. Non puoi eliminarlo.</p>
                    )}
                    <span className="timestamp">
                      Creato il {new Date(profile.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      alle{' '}
                      {new Date(profile.created_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}
