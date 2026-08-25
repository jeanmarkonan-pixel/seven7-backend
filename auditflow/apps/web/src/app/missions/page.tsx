'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function MissionsPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch<Mission[]>('/missions')
      .then(setMissions)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Missions</h1>
        </div>

        {error && <div className="alert-danger">{error}</div>}

        {!missions && !error && <div className="spinner-wrap">Chargement…</div>}

        {missions && missions.length === 0 && (
          <div className="card empty-state">Aucune mission pour l’instant.</div>
        )}

        {missions && missions.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Exercice</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map((m) => (
                    <tr key={m.id} className="clickable" onClick={() => router.push(`/missions/${m.id}`)}>
                      <td>{m.reference}</td>
                      <td>{m.client.raison_sociale}</td>
                      <td>{m.ref_type_mission.libelle}</td>
                      <td>
                        {new Date(m.exercice_debut).getFullYear()} – {new Date(m.exercice_fin).getFullYear()}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: `${m.ref_statut_mission.couleur}22`, color: m.ref_statut_mission.couleur }}
                        >
                          {m.ref_statut_mission.libelle}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
