import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { LoginForm } from './components/auth/LoginForm';
import { AdminUsersPanel } from './components/admin/AdminUsersPanel';
import { CasesPage } from './features/cases/CasesPage';
import { OfficesPage } from './features/offices/OfficesPage';
import { ToastContainer, useToast } from './components/Toast';
import './App.css';

type ProfileRole = 'admin' | 'operatore' | 'solo_lettura';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: ProfileRole;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'cases' | 'offices' | 'admin'>('cases');
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    let ignore = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ignore) {
        setSession(session);
        setSessionLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        setProfileError(error.message);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
        setProfileError(
          'Profilo non trovato. Contatta un amministratore per completare la configurazione.'
        );
      }

      setProfileLoading(false);
    };

    fetchProfile();
  }, [session]);

  const handleSignOut = async () => {
    setSignOutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSignOutError(error.message);
    }
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Caricamento in corso…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-wrapper">
        <LoginForm />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isReadOnly = profile?.role === 'solo_lettura';
  const canManageOffices = !isReadOnly;
  const displayName =
    profile?.display_name ||
    profile?.username ||
    session.user.user_metadata.display_name ||
    session.user.email ||
    'Operatore';

  return (
    <div className="app-shell">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <header className="app-header">
        <div className="header-brand">
          <h1>Gestionale Veicoli</h1>
          <p>Gestione pratiche di sequestro e rilascio</p>
        </div>
        <div className="header-actions">
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            {profile?.role && <span className="role-badge">{profile.role}</span>}
          </div>
          <button type="button" className="secondary" onClick={handleSignOut}>
            Esci
          </button>
        </div>
      </header>

      {profileError && (
        <div className="alert warning">
          <strong>Attenzione:</strong> {profileError}
        </div>
      )}
      {signOutError && (
        <div className="alert error">
          <strong>Errore logout:</strong> {signOutError}
        </div>
      )}

      <main className="app-content cases-root">
        <nav className="app-nav">
          <button
            type="button"
            className={activeSection === 'cases' ? 'nav-pill active' : 'nav-pill'}
            onClick={() => setActiveSection('cases')}
          >
            Pratiche
          </button>
          <button
            type="button"
            className={activeSection === 'offices' ? 'nav-pill active' : 'nav-pill'}
            onClick={() => setActiveSection('offices')}
          >
            Anagrafiche uffici
          </button>
          {isAdmin ? (
            <button
              type="button"
              className={activeSection === 'admin' ? 'nav-pill active' : 'nav-pill'}
              onClick={() => setActiveSection('admin')}
            >
              Gestione utenti
            </button>
          ) : null}
        </nav>

        <div className="app-section">
          {activeSection === 'cases' && <CasesPage showToast={showToast} />}
          {activeSection === 'offices' && <OfficesPage canEdit={canManageOffices} showToast={showToast} />}
          {activeSection === 'admin' && (
            <div className="single-panel">
              <AdminUsersPanel isAdmin={isAdmin} currentUserId={session.user.id} showToast={showToast} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
