import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Credentials = {
  username: string;
  password: string;
};

export function LoginForm() {
  const [credentials, setCredentials] = useState<Credentials>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    field: keyof Credentials,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const username = credentials.username.trim().toLowerCase();
    const password = credentials.password;
    const loginEmail = username.includes('@')
      ? username
      : `${username}@app.local`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (signInError) {
      setError(
        signInError.message ||
          'Accesso non riuscito. Controlla le credenziali inserite.'
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-card">
      <h1>Gestionale Veicoli</h1>
      <p className="subtitle">Accedi con le credenziali fornite dall’amministratore</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            placeholder="es. scozzarini"
            value={credentials.username}
            onChange={(event) => handleChange('username', event)}
            required
            disabled={loading}
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={credentials.password}
            onChange={(event) => handleChange('password', event)}
            required
            disabled={loading}
            minLength={6}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>

      <p className="help-text">
        Problemi di accesso? Contatta l’amministratore per reimpostare la
        password.
      </p>
    </div>
  );
}

