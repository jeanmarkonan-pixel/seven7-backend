'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { TopBar } from '@/components/TopBar';
import { ApiError, apiFetch } from '@/lib/api';
import type { Anomalie, AnomalieHistoriqueEntry, StatutAnomalie } from '@/lib/types';
import { ANOMALIE_WRITE_ROLES } from '@/lib/types';
import { useRequireAuth } from '@/lib/use-require-auth';

export default function AnomalieDetailPage() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [anomalie, setAnomalie] = useState<Anomalie | null>(null);
  const [statuts, setStatuts] = useState<StatutAnomalie[] | null>(null);
  const [historique, setHistorique] = useState<AnomalieHistoriqueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statutCode, setStatutCode] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    return Promise.all([
      apiFetch<Anomalie>(`/anomalies/${params.id}`),
      apiFetch<StatutAnomalie[]>('/statuts-anomalie'),
      apiFetch<AnomalieHistoriqueEntry[]>(`/anomalies/${params.id}/historique`),
    ]).then(([a, s, h]) => {
      setAnomalie(a);
      setStatuts(s);
      setHistorique(h);
      setStatutCode(a.ref_statut_anomalie.code);
    });
  }

  useEffect(() => {
    if (!ready) return;
    load().catch((err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue'));
  }, [ready, params.id]);

  async function handleStatutChange(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      // conclusion n'est honoré côté API que si statutCode==="close" —
      // AnomaliesService.update() ; l'envoyer sinon ne fait rien de mal,
      // simplement ignoré.
      await apiFetch<Anomalie>(`/anomalies/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          statutCode,
          commentaire: commentaire || undefined,
          conclusion: statutCode === 'close' ? conclusion || undefined : undefined,
        }),
      });
      setCommentaire('');
      await load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <TopBar user={user} />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        {anomalie?.mission_id && (
          <button
            className="btn btn-secondary"
            style={{ marginBottom: 24 }}
            onClick={() => router.push(`/missions/${anomalie.mission_id}`)}
          >
            ← Mission
          </button>
        )}

        {error && <div className="alert-danger">{error}</div>}
        {!anomalie && !error && <div className="spinner-wrap">Chargement…</div>}

        {anomalie && statuts && (
          <>
            <div style={{ marginBottom: 8 }}>
              <span
                className="badge"
                style={{
                  background: `${anomalie.ref_statut_anomalie.couleur}22`,
                  color: anomalie.ref_statut_anomalie.couleur,
                }}
              >
                {anomalie.ref_statut_anomalie.libelle}
              </span>
              {anomalie.impact_significatif && (
                <span className="badge" style={{ marginLeft: 8, background: '#ef444422', color: '#ef4444' }}>
                  Impact significatif
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{anomalie.titre}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>{anomalie.reference}</p>

            <div className="card" style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Description</p>
              <p style={{ marginBottom: anomalie.montant_impact ? 16 : 0 }}>{anomalie.description}</p>
              {anomalie.montant_impact && (
                <>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    Montant d’impact
                  </p>
                  <p>{Number(anomalie.montant_impact).toLocaleString('fr-FR')} FCFA</p>
                </>
              )}
              {anomalie.conclusion && (
                <>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 16, marginBottom: 4 }}>
                    Conclusion
                  </p>
                  <p>{anomalie.conclusion}</p>
                </>
              )}
            </div>

            {user && ANOMALIE_WRITE_ROLES.includes(user.roleCode) && (
              <form onSubmit={handleStatutChange} className="card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Changer le statut</h2>
                {saveError && <div className="alert-danger">{saveError}</div>}

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
                  <label htmlFor="commentaire">Commentaire (consigné dans l’historique)</label>
                  <textarea id="commentaire" rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
                </div>

                {statutCode === 'close' && (
                  <div className="field">
                    <label htmlFor="conclusion">Conclusion de clôture</label>
                    <textarea id="conclusion" rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </form>
            )}

            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Historique</h2>
            {historique && historique.length === 0 && (
              <div className="card empty-state">Aucun changement de statut enregistré.</div>
            )}
            {historique && historique.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transition</th>
                        <th>Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historique.map((h) => (
                        <tr key={h.id}>
                          <td>{new Date(h.date_modification).toLocaleString('fr-FR')}</td>
                          <td>
                            {h.ref_statut_anomalie_anomalie_historique_statut_precedentToref_statut_anomalie
                              ?.libelle ?? '—'}{' '}
                            →{' '}
                            {h.ref_statut_anomalie_anomalie_historique_statut_nouveauToref_statut_anomalie.libelle}
                          </td>
                          <td>{h.commentaire ?? '—'}</td>
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
