'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getToken, getUser, type SessionUser } from './auth';

/** Redirige vers /login si aucune session locale n'existe. */
export function useRequireAuth(): { user: SessionUser | null; ready: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    setReady(true);
  }, [router]);

  return { user, ready };
}
