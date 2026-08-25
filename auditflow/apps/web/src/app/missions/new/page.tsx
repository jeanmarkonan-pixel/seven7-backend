'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { Client, Mission, TypeMission } from '@/lib/types';
import { MISSION_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function NewMissionPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[] | null>(null);
  const [types, setTypes] = useState<TypeMission[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [typeMissionCode, setTypeMissionCode] = useState('');
  const [reference, setReference] = useState('');
  const [exerciceDebut, setExerciceDebut] = useState('');
  const [exerciceFin, setExerciceFin] = useState('');
  const [objectif, setObjectif] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    Promise.all([apiFetch<Client[]>('/clients'), apiFetch<TypeMission[]>('/types-mission')])
      .then(([c, t]) => {
        setClients(c);
        setTypes(t);
        if (c.length > 0) setClientId(c[0].id);
        if (t.length > 0) setTypeMissionCode(t[0].code);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const mission = await apiFetch<Mission>('/missions', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          typeMissionCode,
          reference,
          exerciceDebut,
          exerciceFin,
          objectif: objectif || undefined,
        }),
      });
      router.push(`/missions/${mission.id}`);
    } catch (err) {
      // 409 (référence déjà utilisée dans ce cabinet) et 400 (dates
      // incohérentes, cf. MissionsService.assertDatesCoherentes) arrivent
      // ici avec le message exact de l'API — pas reformulés, pour ne pas
      // désynchroniser le message affiché de la règle réellement appliquée.
      setSubmitError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  if (user && !MISSION_WRITE_ROLES.includes(user.roleCode)) {
    return (
      <>
        <TopBar user={user} />
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
          <div className="alert-danger">
            Votre rôle ({user.roleCode}) ne permet pas de créer de mission.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
        <button className="btn btn-secondary" style={{ marginBottom: 24 }} onClick={() => router.push('/missions')}>
          ← Missions
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Nouvelle mission</h1>

        {loadError && <div className="alert-danger">{loadError}</div>}

        {clients && types && (
          <form onSubmit={handleSubmit} className="card">
            {submitError && <div className="alert-danger">{submitError}</div>}

            <div className="field">
              <label htmlFor="clientId">Client</label>
              {clients.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Aucun client dans ce cabinet — créez-en un d’abord.
                </p>
              ) : (
                <select id="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.raison_sociale}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="field">
              <label htmlFor="typeMissionCode">Type de mission</label>
              <select
                id="typeMissionCode"
                required
                value={typeMissionCode}
                onChange={(e) => setTypeMissionCode(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="reference">Référence</label>
              <input
                id="reference"
                required
                placeholder="MIS-2026-002"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="exerciceDebut">Début d’exercice</label>
                <input
                  id="exerciceDebut"
                  type="date"
                  required
                  value={exerciceDebut}
                  onChange={(e) => setExerciceDebut(e.target.value)}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="exerciceFin">Fin d’exercice</label>
                <input
                  id="exerciceFin"
                  type="date"
                  required
                  value={exerciceFin}
                  onChange={(e) => setExerciceFin(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="objectif">Objectif (facultatif)</label>
              <textarea id="objectif" rows={3} value={objectif} onChange={(e) => setObjectif(e.target.value)} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || clients.length === 0}>
              {submitting ? 'Création…' : 'Créer la mission'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
