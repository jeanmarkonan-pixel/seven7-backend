'use client';

import { useRouter } from 'next/navigation';

import { clearSession, type SessionUser } from '@/lib/auth';

export function TopBar({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <header className="topbar">
      <span className="topbar-brand">AUDITFLOW</span>
      {user && (
        <div className="topbar-user">
          <span>
            {user.prenom} {user.nom} · <span className="badge">{user.roleCode}</span>
          </span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
