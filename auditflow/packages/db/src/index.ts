import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/**
 * Instance partagée du client Prisma.
 *
 * En développement, Nest et Next rechargent les modules à chaud : sans ce cache
 * sur globalThis, chaque rechargement ouvrirait un nouveau pool de connexions et
 * finirait par saturer PostgreSQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
