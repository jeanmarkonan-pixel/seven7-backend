import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'AUDITFLOW — Suite d’audit externe OHADA',
  description:
    'Suite digitale d’audit externe pour les cabinets de la zone OHADA. ISA, SYSCOHADA, offline-first.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
