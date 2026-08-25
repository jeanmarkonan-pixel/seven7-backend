const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Health = { status: string; database: string; timestamp: string };

async function getHealth(): Promise<Health | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    // L'API n'est pas démarrée : la page doit rester lisible malgré tout.
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();
  const apiUp = health !== null;
  const dbUp = health?.database === 'up';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '96px 24px' }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        Zone OHADA · ISA · SYSCOHADA
      </p>

      <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1, margin: '12px 0 16px' }}>
        AUDITFLOW
      </h1>

      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 40 }}>
        Suite d’audit externe pour les cabinets de la zone OHADA. Squelette de
        développement — la connexion à l’API et à PostgreSQL est vérifiée ci-dessous.
      </p>

      <section
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>État des services</h2>
        <StatusRow label="API NestJS" ok={apiUp} detail={API_URL} />
        <StatusRow label="PostgreSQL" ok={dbUp} detail="schéma auditflow" />
      </section>
    </main>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderTop: '1px solid rgba(71,85,105,0.3)',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{detail}</div>
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: ok ? 'var(--color-positive)' : 'var(--color-danger)',
        }}
      >
        {ok ? '● en ligne' : '● hors ligne'}
      </span>
    </div>
  );
}
