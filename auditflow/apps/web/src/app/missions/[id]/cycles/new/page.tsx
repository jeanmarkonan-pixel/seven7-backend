'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { CycleIsa, MissionCycle } from '@/lib/types';
import { CYCLE_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function NewMissionCyclePage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [cycles, setCycles] = useState<CycleIsa[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cycleCode, setCycleCode] = useState('');
  const [risqueGlobal, setRisqueGlobal] = useState('');
  const [materialite, setMaterialite] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    apiFetch<CycleIsa[]>('/cycles-isa')
      .then((c) => {
        setCycles(c);
        if (c.length > 0) setCycleCode(c[0].code);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const cycle = await apiFetch<MissionCycle>(`/missions/${params.id}/cycles`, {
        method: 'POST',
        body: JSON.stringify({
          cycleCode,
          risqueGlobal: risqueGlobal || undefined,
          materialite: materialite ? Number(materialite) : undefined,
        }),
      });
      router.push(`/missions/${params.id}/cycles/${cycle.id}`);
    } catch (err) {
      // 409 si le cycle est déjà ouvert sur cette mission (contrainte
      // unique mission_id+cycle_id, MissionCyclesService.create) — message
      // API relayé tel quel.
      setSubmitError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  if (user && !CYCLE_WRITE_ROLES.includes(user.roleCode)) {
    return (
      <>
        <TopBar user={user} />
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
          <div className="alert-danger">Votre rôle ({user.roleCode}) ne permet pas d’ouvrir de cycle.</div>
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
          onClick={() => router.push(`/missions/${params.id}`)}
        >
          ← Mission
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Ouvrir un cycle ISA</h1>

        {loadError && <div className="alert-danger">{loadError}</div>}

        {cycles && (
          <form onSubmit={handleSubmit} className="card">
            {submitError && <div className="alert-danger">{submitError}</div>}

            <div className="field">
              <label htmlFor="cycleCode">Cycle</label>
              <select id="cycleCode" required value={cycleCode} onChange={(e) => setCycleCode(e.target.value)}>
                {cycles.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="risqueGlobal">Risque global (facultatif)</label>
              <select id="risqueGlobal" value={risqueGlobal} onChange={(e) => setRisqueGlobal(e.target.value)}>
                <option value="">— non évalué —</option>
                <option value="faible">Faible</option>
                <option value="moyen">Moyen</option>
                <option value="eleve">Élevé</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="materialite">Matérialité (facultatif, FCFA)</label>
              <input
                id="materialite"
                type="number"
                min={0}
                value={materialite}
                onChange={(e) => setMaterialite(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Ouverture…' : 'Ouvrir le cycle'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
