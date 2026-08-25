'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { Mission, MissionCycle } from '@/lib/types';
import { CYCLE_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function MissionDetailPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [mission, setMission] = useState<Mission | null>(null);
  const [cycles, setCycles] = useState<MissionCycle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      apiFetch<Mission>(`/missions/${params.id}`),
      apiFetch<MissionCycle[]>(`/missions/${params.id}/cycles`),
    ])
      .then(([m, c]) => {
        setMission(m);
        setCycles(c);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready, params.id]);

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 24 }}
          onClick={() => router.push('/missions')}
        >
          ← Missions
        </button>

        {error && <div className="alert-danger">{error}</div>}
        {!mission && !error && <div className="spinner-wrap">Chargement…</div>}

        {mission && (
          <>
            <div style={{ marginBottom: 8 }}>
              <span
                className="badge"
                style={{
                  background: `${mission.ref_statut_mission.couleur}22`,
                  color: mission.ref_statut_mission.couleur,
                }}
              >
                {mission.ref_statut_mission.libelle}
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{mission.reference}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>
              {mission.client.raison_sociale} · {mission.ref_type_mission.libelle} · exercice{' '}
              {new Date(mission.exercice_debut).getFullYear()}
            </p>

            {mission.objectif && (
              <div className="card" style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>Objectif</p>
                <p>{mission.objectif}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Cycles ISA</h2>
              {user && CYCLE_WRITE_ROLES.includes(user.roleCode) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => router.push(`/missions/${params.id}/cycles/new`)}
                >
                  + Ouvrir un cycle
                </button>
              )}
            </div>

            {cycles && cycles.length === 0 && (
              <div className="card empty-state">Aucun cycle ouvert sur cette mission.</div>
            )}

            {cycles && cycles.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Cycle</th>
                        <th>Statut</th>
                        <th>Risque global</th>
                        <th>Matérialité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycles.map((c) => (
                        <tr
                          key={c.id}
                          className="clickable"
                          onClick={() => router.push(`/missions/${params.id}/cycles/${c.id}`)}
                        >
                          <td>{c.ref_cycle_isa.libelle}</td>
                          <td>{c.statut}</td>
                          <td>{c.risque_global ?? '—'}</td>
                          <td>{c.materielite ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
