'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { Anomalie } from '@/lib/types';
import { ANOMALIE_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function NewAnomaliePage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [montantImpact, setMontantImpact] = useState('');
  const [impactSignificatif, setImpactSignificatif] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Pas de champ "reference" envoyé : trg_anomalie_reference (BEFORE
      // INSERT côté SQL) la génère et écraserait de toute façon toute
      // valeur fournie ici — voir AnomaliesService.create().
      const anomalie = await apiFetch<Anomalie>(`/missions/${params.id}/anomalies`, {
        method: 'POST',
        body: JSON.stringify({
          titre,
          description,
          montantImpact: montantImpact ? Number(montantImpact) : undefined,
          impactSignificatif,
        }),
      });
      router.push(`/anomalies/${anomalie.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  if (user && !ANOMALIE_WRITE_ROLES.includes(user.roleCode)) {
    return (
      <>
        <TopBar user={user} />
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
          <div className="alert-danger">Votre rôle ({user.roleCode}) ne permet pas d’ouvrir d’anomalie.</div>
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

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Nouvelle anomalie</h1>

        <form onSubmit={handleSubmit} className="card">
          {submitError && <div className="alert-danger">{submitError}</div>}

          <div className="field">
            <label htmlFor="titre">Titre</label>
            <input
              id="titre"
              required
              placeholder="Écart de rapprochement bancaire"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="montantImpact">Montant d’impact (facultatif, FCFA)</label>
            <input
              id="montantImpact"
              type="number"
              min={0}
              value={montantImpact}
              onChange={(e) => setMontantImpact(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={impactSignificatif}
              onChange={(e) => setImpactSignificatif(e.target.checked)}
            />
            Impact significatif
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Ouverture…' : 'Ouvrir l’anomalie'}
          </button>
        </form>
      </main>
    </>
  );
}
