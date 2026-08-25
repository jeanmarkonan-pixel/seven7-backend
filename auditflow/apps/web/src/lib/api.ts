'use client';

import { clearSession, getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Wrapper fetch authentifié. Sur 401 d'une requête QUI PORTAIT un token,
 * purge la session locale : un token expiré ou un compte désactivé en
 * cours de session (voir JwtStrategy côté API, qui revalide à chaque
 * requête) ne doit pas laisser l'écran dans un état incohérent — la page
 * appelante doit alors rediriger vers /login (voir useRequireAuth).
 *
 * Un 401 SANS token — /auth/login avec de mauvais identifiants — n'a
 * aucune session à purger : ce n'est pas une expiration, c'est un
 * refus de connexion. Confondre les deux affichait "Session expirée"
 * à quelqu'un qui vient seulement de se tromper de mot de passe.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    clearSession();
    throw new ApiError(401, 'Session expirée');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
