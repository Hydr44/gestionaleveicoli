import { useEffect, useMemo, useState } from 'react';
import {
  fetchDestinationOffices,
  createDestinationOffice,
  updateDestinationOffice,
  deleteDestinationOffices,
} from '../cases/api';
import type {
  DestinationOfficeFormData,
  DestinationOfficeRecord,
  OfficeTypeOption,
} from '../cases/types';

type OfficesPageProps = {
  canEdit: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

type ModalMode = 'create' | 'edit';

const defaultForm: DestinationOfficeFormData = {
  office_type: 'persona_giuridica',
  name: '',
  tax_code: '',
  vat_number: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  phone: '',
  email: '',
  pec: '',
  notes: '',
};

export function OfficesPage({ canEdit, showToast }: OfficesPageProps) {
  const [records, setRecords] = useState<DestinationOfficeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | OfficeTypeOption>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [modalSaving, setModalSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationOfficeFormData>(defaultForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDestinationOffices();
        setRecords(data);
        setSelectedIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
      } catch (err: unknown) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : 'Errore durante il caricamento delle anagrafiche uffici.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((item) => {
      const matchesType = typeFilter === 'all' || item.office_type === typeFilter;
      const tokens = [
        item.name,
        item.tax_code ?? '',
        item.vat_number ?? '',
        item.city ?? '',
        item.province ?? '',
        item.email ?? '',
        item.pec ?? '',
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || tokens.includes(query);
      return matchesType && matchesQuery;
    });
  }, [records, search, typeFilter]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setForm(defaultForm);
    setSelectedId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (record: DestinationOfficeRecord) => {
    setModalMode('edit');
    setSelectedId(record.id);
    setForm({
      office_type: record.office_type,
      name: record.name ?? '',
      tax_code: record.tax_code ?? '',
      vat_number: record.vat_number ?? '',
      address: record.address ?? '',
      city: record.city ?? '',
      province: record.province ?? '',
      postal_code: record.postal_code ?? '',
      phone: record.phone ?? '',
      email: record.email ?? '',
      pec: record.pec ?? '',
      notes: record.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalSaving) return;
    setModalOpen(false);
    setSelectedId(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;

    setModalSaving(true);
    try {
      if (modalMode === 'create') {
        const created = await createDestinationOffice(form);
        setRecords((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Anagrafica creata con successo', 'success');
      } else if (selectedId) {
        const updated = await updateDestinationOffice(selectedId, form);
        setRecords((prev) =>
          prev
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        showToast('Anagrafica modificata con successo', 'success');
      }
      setModalOpen(false);
      setSelectedId(null);
      setForm(defaultForm);
    } catch (submitError: unknown) {
      const message = submitError instanceof Error
        ? submitError.message
        : 'Errore durante il salvataggio dell\'anagrafica.';
      showToast(message, 'error');
      console.error(submitError);
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="offices-page">
      <header className="offices-header">
        <div>
          <h2>Anagrafiche uffici destinatari</h2>
          <p>
            Archivia le anagrafiche degli uffici destinatari per un inserimento rapido durante la
            creazione delle pratiche.
          </p>
        </div>
        {canEdit && (
          <button type="button" className="primary" onClick={handleOpenCreate}>
            + Nuovo ufficio
          </button>
        )}
      </header>

      <div className="offices-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-counter">
            {selectedIds.length > 0
              ? `${selectedIds.length} anagrafiche selezionate`
              : 'Nessuna selezione'}
          </span>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            className={`danger ghost ${deleting ? 'loading' : ''}`}
            onClick={async () => {
              if (!canEdit || selectedIds.length === 0 || deleting) return;
              if (
                window.confirm(
                  selectedIds.length === 1
                    ? 'Confermi l\'eliminazione dell\'anagrafica selezionata?'
                    : `Confermi l'eliminazione delle ${selectedIds.length} anagrafiche selezionate?`
                )
              ) {
                setDeleting(true);
                try {
                  await deleteDestinationOffices(selectedIds);
                  setRecords((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
                  setSelectedIds([]);
                  showToast(
                    selectedIds.length === 1
                      ? 'Anagrafica eliminata con successo'
                      : `${selectedIds.length} anagrafiche eliminate con successo`,
                    'success'
                  );
                } catch (deleteError) {
                  const message = deleteError instanceof Error ? deleteError.message : 'Errore durante l\'eliminazione delle anagrafiche';
                  showToast(message, 'error');
                  console.error(deleteError);
                } finally {
                  setDeleting(false);
                }
              }
            }}
            disabled={!canEdit || selectedIds.length === 0 || deleting}
          >
            {deleting ? 'Eliminazione...' : 'Elimina selezionate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <strong>Errore:</strong> {error}
        </div>
      )}

      <section className="offices-filters">
        <label>
          <span>Ricerca</span>
          <input
            type="search"
            placeholder="Nome, città, CF/P.IVA, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span>Tipologia</span>
          <div className="select-wrapper">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | OfficeTypeOption)}
            >
              <option value="all">Tutte</option>
              <option value="persona_giuridica">Persone giuridiche</option>
              <option value="persona_fisica">Persone fisiche</option>
            </select>
            <span className="chevron">▾</span>
          </div>
        </label>
      </section>

      {loading ? (
        <div className="cases-spinner full">
          <div className="spinner" />
          <p>Caricamento anagrafiche...</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          Nessun ufficio destinatario corrisponde ai criteri impostati.
        </p>
      ) : (
        <div className="offices-grid">
          {filtered.map((office) => (
            <article key={office.id} className="office-card">
              <header>
                <div>
                  {canEdit && (
                    <label className="card-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(office.id)}
                        onChange={() =>
                          setSelectedIds((prev) =>
                            prev.includes(office.id)
                              ? prev.filter((id) => id !== office.id)
                              : [...prev, office.id]
                          )
                        }
                      />
                    </label>
                  )}
                  <span className="office-chip">
                    {office.office_type === 'persona_giuridica'
                      ? 'Persona giuridica'
                      : 'Persona fisica'}
                  </span>
                  <h3>{office.name}</h3>
                  <p className="office-subtitle">
                    {[office.city, office.province].filter(Boolean).join(' • ') || 'Località n.d.'}
                  </p>
                </div>
                {canEdit && (
                  <div className="office-card-actions">
                    <button
                      type="button"
                      className="secondary ghost small"
                      onClick={() => handleOpenEdit(office)}
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      className={`danger ghost small ${deleting ? 'loading' : ''}`}
                      onClick={async () => {
                        if (deleting) return;
                        if (
                          window.confirm('Confermi l\'eliminazione di questa anagrafica?')
                        ) {
                          setDeleting(true);
                          try {
                            await deleteDestinationOffices([office.id]);
                            setRecords((prev) => prev.filter((item) => item.id !== office.id));
                            setSelectedIds((prev) => prev.filter((id) => id !== office.id));
                            showToast('Anagrafica eliminata con successo', 'success');
                          } catch (deleteError) {
                            const message = deleteError instanceof Error ? deleteError.message : 'Errore durante l\'eliminazione dell\'anagrafica';
                            showToast(message, 'error');
                            console.error(deleteError);
                          } finally {
                            setDeleting(false);
                          }
                        }
                      }}
                      disabled={deleting}
                    >
                      {deleting ? 'Eliminazione...' : 'Elimina'}
                    </button>
                  </div>
                )}
              </header>
              <dl>
                {office.tax_code && (
                  <>
                    <dt>Codice fiscale</dt>
                    <dd>{office.tax_code}</dd>
                  </>
                )}
                {office.vat_number && (
                  <>
                    <dt>Partita IVA</dt>
                    <dd>{office.vat_number}</dd>
                  </>
                )}
                {office.address && (
                  <>
                    <dt>Indirizzo</dt>
                    <dd>
                      {office.address}
                      {office.postal_code ? ` • ${office.postal_code}` : ''}
                    </dd>
                  </>
                )}
                {office.phone && (
                  <>
                    <dt>Telefono</dt>
                    <dd>{office.phone}</dd>
                  </>
                )}
                {office.email && (
                  <>
                    <dt>Email</dt>
                    <dd>{office.email}</dd>
                  </>
                )}
                {office.pec && (
                  <>
                    <dt>PEC</dt>
                    <dd>{office.pec}</dd>
                  </>
                )}
                {office.notes && (
                  <>
                    <dt>Note</dt>
                    <dd>{office.notes}</dd>
                  </>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>
                {modalMode === 'create' ? 'Nuovo ufficio destinatario' : 'Modifica ufficio destinatario'}
              </h3>
              <p>
                Compila i dati dell’ufficio. Queste informazioni saranno disponibili durante la
                creazione delle pratiche.
              </p>
            </div>
            <form className="modal-body scrollable" onSubmit={handleSubmit}>
              <div className="office-type-selector">
                <label>
                  <input
                    type="radio"
                    name="office_type"
                    value="persona_giuridica"
                    checked={form.office_type === 'persona_giuridica'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        office_type: event.target.value as OfficeTypeOption,
                      }))
                    }
                  />
                  Persona giuridica
                </label>
                <label>
                  <input
                    type="radio"
                    name="office_type"
                    value="persona_fisica"
                    checked={form.office_type === 'persona_fisica'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        office_type: event.target.value as OfficeTypeOption,
                        vat_number: '',
                      }))
                    }
                  />
                  Persona fisica
                </label>
              </div>

              <div className="form-grid">
                <label className="full-width">
                  <span>Denominazione / Nome e cognome</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                {form.office_type === 'persona_fisica' ? (
                  <label>
                    <span>Codice fiscale</span>
                    <input
                      type="text"
                      required
                      value={form.tax_code}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, tax_code: event.target.value }))
                      }
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Codice fiscale (opzionale)</span>
                      <input
                        type="text"
                        value={form.tax_code}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, tax_code: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Partita IVA</span>
                      <input
                        type="text"
                        required
                        value={form.vat_number}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, vat_number: event.target.value }))
                        }
                      />
                    </label>
                  </>
                )}
                <label className="full-width">
                  <span>Indirizzo</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Comune</span>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Provincia</span>
                  <input
                    type="text"
                    value={form.province}
                    maxLength={2}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, province: event.target.value.toUpperCase() }))
                    }
                  />
                </label>
                <label>
                  <span>CAP</span>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, postal_code: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Telefono</span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>PEC</span>
                  <input
                    type="email"
                    value={form.pec}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, pec: event.target.value }))
                    }
                  />
                </label>
                <label className="full-width">
                  <span>Note</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary ghost" onClick={handleCloseModal}>
                  Annulla
                </button>
                <button type="submit" className={`primary ${modalSaving ? 'loading' : ''}`} disabled={modalSaving}>
                  {modalSaving ? 'Salvataggio...' : 'Salva anagrafica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

