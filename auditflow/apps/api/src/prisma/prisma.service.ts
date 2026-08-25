import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@auditflow/db';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Exécute `fn` dans une transaction où les triggers d'audit_trail
   * (mission, mission_cycle, test_execution, anomalie, document, rapport)
   * connaissent l'auteur et son cabinet — via les variables de session
   * Postgres `audit.utilisateur_id`/`audit.cabinet_id`, que
   * audit_trigger_function() lit avec current_setting(). set_config(...,
   * true) = portée LOCAL : la variable retombe à la fin de la transaction,
   * jamais visible par une autre requête sur une connexion réutilisée du
   * pool.
   *
   * Chaque service métier qui écrit sur une table auditée doit passer par
   * withActor() plutôt que par un appel Prisma direct — sinon les lignes
   * d'audit_trail générées restent avec cabinet_id/utilisateur_id à NULL,
   * inutilisables pour la traçabilité exigée par le plan de conformité
   * (§7.1).
   */
  async withActor<T>(
    actor: AuthenticatedUser,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('audit.utilisateur_id', ${actor.id}, true)`;
      await tx.$executeRaw`SELECT set_config('audit.cabinet_id', ${actor.cabinetId}, true)`;
      return fn(tx);
    });
  }
}
