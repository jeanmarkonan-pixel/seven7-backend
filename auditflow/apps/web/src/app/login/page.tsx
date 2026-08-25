'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ApiError, apiFetch } from '@/lib/api';
import { setSession } from '@/lib/auth';

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    roleCode: string;
    cabinetId: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token, user } = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(access_token, user);
      router.push('/missions');
    } catch (err) {
      // Message générique côté API pour email inconnu comme mot de passe
      // faux (AuthService.login) — on ne le reformule pas ici, sous peine
      // de réintroduire côté front la fuite d'information évitée côté API.
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: 8,
          }}
        >
          AUDITFLOW
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Connexion</h1>

        {error && <div className="alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
