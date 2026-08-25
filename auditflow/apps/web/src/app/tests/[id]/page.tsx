'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { StatutTest, Test } from '@/lib/types';
import { TEST_REVIEW_ROLES, TEST_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function TestDetailPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [test, setTest] = useState<Test | null>(null);
  const [statuts, setStatuts] = useState<StatutTest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statutCode, setStatutCode] = useState('');
  const [resultat, setResultat] = useState('');
  const [score, setScore] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [savingExecution, setSavingExecution] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  function load() {
    return Promise.all([apiFetch<Test>(`/tests/${params.id}`), apiFetch<StatutTest[]>('/statuts-test')]).then(
      ([t, s]) => {
        setTest(t);
        setStatuts(s);
        setStatutCode(t.ref_statut_test.code);
        setResultat(t.resultat ?? '');
        setScore(t.score?.toString() ?? '');
        setConclusion(t.conclusion ?? '');
      },
    );
  }

  useEffect(() => {
    if (!ready) return;
    load().catch((err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready, params.id]);

  async function handleRecordExecution(e: FormEvent) {
    e.preventDefault();
    setExecutionError(null);
    setSavingExecution(true);
    try {
      await apiFetch<Test>(`/tests/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          statutCode,
          resultat: resultat || undefined,
          score: score ? Number(score) : undefined,
          conclusion: conclusion || undefined,
        }),
      });
      await load();
    } catch (err) {
      setExecutionError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSavingExecution(false);
    }
  }

  async function handleReview() {
    setReviewError(null);
    setReviewing(true);
    try {
      await apiFetch<Test>(`/tests/${params.id}/revue`, { method: 'POST' });
      await load();
    } catch (err) {
      // Couvre le niveau insuffisant ET la séparation des tâches (on ne
      // peut pas revoir son propre test) — TestsService.review(), message
      // API relayé tel quel.
      setReviewError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setReviewing(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        {test?.mission_cycle && (
          <button
            className="btn btn-secondary"
            style={{ marginBottom: 24 }}
            onClick={() => router.push(`/missions/${test.mission_cycle!.mission_id}/cycles/${test.mission_cycle!.id}`)}
          >
            ← Cycle
          </button>
        )}

        {error && <div className="alert-danger">{error}</div>}
        {!test && !error && <div className="spinner-wrap">Chargement…</div>}

        {test && statuts && (
          <>
            <div style={{ marginBottom: 8 }}>
              <span
                className="badge"
                style={{ background: `${test.ref_statut_test.couleur}22`, color: test.ref_statut_test.couleur }}
              >
                {test.ref_statut_test.libelle}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{test.reference}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>{test.ref_type_test.libelle}</p>

            <div className="card" style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Objectif</p>
              <p style={{ marginBottom: 16 }}>{test.objectif}</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Procédure</p>
              <p>{test.procedure}</p>
            </div>

            {test.execute_par && (
              <div className="card" style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Exécuté le {test.date_execution ? new Date(test.date_execution).toLocaleDateString('fr-FR') : '—'}
                </p>
                {test.revu_par ? (
                  <p style={{ fontSize: 13, color: 'var(--color-positive)', marginTop: 4 }}>
                    ✓ Revu le {test.date_revue ? new Date(test.date_revue).toLocaleDateString('fr-FR') : '—'}
                  </p>
                ) : (
                  user &&
                  TEST_REVIEW_ROLES.includes(user.roleCode) && (
                    <div style={{ marginTop: 12 }}>
                      {reviewError && <div className="alert-danger">{reviewError}</div>}
                      <button className="btn btn-secondary" onClick={handleReview} disabled={reviewing}>
                        {reviewing ? 'Enregistrement…' : 'Marquer comme revu'}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {user && TEST_WRITE_ROLES.includes(user.roleCode) && (
              <form onSubmit={handleRecordExecution} className="card">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Enregistrer l’exécution</h2>
                {executionError && <div className="alert-danger">{executionError}</div>}

                <div className="field">
                  <label htmlFor="statutCode">Statut</label>
                  <select id="statutCode" value={statutCode} onChange={(e) => setStatutCode(e.target.value)}>
                    {statuts.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="resultat">Constat</label>
                  <textarea id="resultat" rows={3} value={resultat} onChange={(e) => setResultat(e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="score">Score (facultatif, 0–100)</label>
                  <input id="score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="conclusion">Conclusion (facultatif)</label>
                  <textarea id="conclusion" rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingExecution}>
                  {savingExecution ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </>
  );
}
