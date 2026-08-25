'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { MissionCycle, Test } from '@/lib/types';
import { TEST_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function CycleDetailPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string; cycleId: string }>();

  const [cycle, setCycle] = useState<MissionCycle | null>(null);
  const [tests, setTests] = useState<Test[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      apiFetch<MissionCycle>(`/missions/${params.id}/cycles/${params.cycleId}`),
      apiFetch<Test[]>(`/mission-cycles/${params.cycleId}/tests`),
    ])
      .then(([c, t]) => {
        setCycle(c);
        setTests(t);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready, params.id, params.cycleId]);

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 24 }}
          onClick={() => router.push(`/missions/${params.id}`)}
        >
          ← Mission
        </button>

        {error && <div className="alert-danger">{error}</div>}
        {!cycle && !error && <div className="spinner-wrap">Chargement…</div>}

        {cycle && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{cycle.ref_cycle_isa.libelle}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>
              Statut : {cycle.statut} · Risque global : {cycle.risque_global ?? '—'} · Matérialité :{' '}
              {cycle.materielite ?? '—'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tests</h2>
              {user && TEST_WRITE_ROLES.includes(user.roleCode) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => router.push(`/missions/${params.id}/cycles/${params.cycleId}/tests/new`)}
                >
                  + Nouveau test
                </button>
              )}
            </div>

            {tests && tests.length === 0 && <div className="card empty-state">Aucun test créé sur ce cycle.</div>}

            {tests && tests.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map((t) => (
                        <tr
                          key={t.id}
                          className="clickable"
                          onClick={() => router.push(`/tests/${t.id}`)}
                        >
                          <td>{t.reference}</td>
                          <td>{t.ref_type_test.libelle}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: `${t.ref_statut_test.couleur}22`,
                                color: t.ref_statut_test.couleur,
                              }}
                            >
                              {t.ref_statut_test.libelle}
                            </span>
                          </td>
                          <td>{t.score ?? '—'}</td>
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
