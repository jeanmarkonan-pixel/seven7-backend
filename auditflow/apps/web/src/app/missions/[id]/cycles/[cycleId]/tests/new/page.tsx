'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { MissionCycle, ProgrammeTravail, Test } from '@/lib/types';
import { TEST_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

const LIBRE = '__libre__';

export default function NewTestPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string; cycleId: string }>();

  const [programmes, setProgrammes] = useState<ProgrammeTravail[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [programmeId, setProgrammeId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [typeTestCode, setTypeTestCode] = useState('test_controle');
  const [objectif, setObjectif] = useState('');
  const [procedure, setProcedure] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    apiFetch<MissionCycle>(`/missions/${params.id}/cycles/${params.cycleId}`)
      .then((cycle) => apiFetch<ProgrammeTravail[]>(`/programmes-travail?cycleId=${cycle.ref_cycle_isa.id}`))
      .then((p) => {
        setProgrammes(p);
        setProgrammeId(p.length > 0 ? p[0].id : LIBRE);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready, params.id, params.cycleId]);

  const modeLibre = programmeId === LIBRE;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const test = await apiFetch<Test>(`/mission-cycles/${params.cycleId}/tests`, {
        method: 'POST',
        body: JSON.stringify(
          modeLibre
            ? { reference, typeTestCode, objectif, procedure }
            : { reference, programmeId },
        ),
      });
      router.push(`/tests/${test.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  if (user && !TEST_WRITE_ROLES.includes(user.roleCode)) {
    return (
      <>
        <TopBar user={user} />
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
          <div className="alert-danger">Votre rôle ({user.roleCode}) ne permet pas de créer de test.</div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 24 }}
          onClick={() => router.push(`/missions/${params.id}/cycles/${params.cycleId}`)}
        >
          ← Cycle
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Nouveau test</h1>

        {loadError && <div className="alert-danger">{loadError}</div>}

        {programmes && (
          <form onSubmit={handleSubmit} className="card">
            {submitError && <div className="alert-danger">{submitError}</div>}

            <div className="field">
              <label htmlFor="programmeId">Modèle</label>
              <select id="programmeId" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.objectif.slice(0, 60)}
                    {p.objectif.length > 60 ? '…' : ''}
                  </option>
                ))}
                <option value={LIBRE}>— Test libre (objectif et procédure personnalisés) —</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="reference">Référence</label>
              <input
                id="reference"
                required
                placeholder="TC-CASH-09"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {modeLibre && (
              <>
                <div className="field">
                  <label htmlFor="typeTestCode">Type de test</label>
                  <select id="typeTestCode" value={typeTestCode} onChange={(e) => setTypeTestCode(e.target.value)}>
                    <option value="test_controle">Test de contrôle</option>
                    <option value="proc_substantielle">Procédure substantielle</option>
                    <option value="analytique">Procédure analytique</option>
                    <option value="circularisation">Circularisation</option>
                    <option value="observation">Observation</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="objectif">Objectif</label>
                  <textarea id="objectif" rows={2} required value={objectif} onChange={(e) => setObjectif(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="procedure">Procédure</label>
                  <textarea id="procedure" rows={3} required value={procedure} onChange={(e) => setProcedure(e.target.value)} />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer le test'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
