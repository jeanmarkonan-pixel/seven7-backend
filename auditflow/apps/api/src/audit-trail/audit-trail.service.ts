import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditTrailFilters {
  missionId?: string;
  table?: string;
  action?: string;
  page: number;
  perPage: number;
}

@Injectable()
export class AuditTrailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lecture seule — jamais de write ici. cabinet_id sur audit_trail n'est
   * fiable que depuis que les écritures passent par
   * PrismaService.withActor() (voir les 6 services métier) ; les lignes
   * antérieures à ce câblage restent avec cabinet_id NULL et n'apparaîtront
   * dans aucun résultat filtré par cabinet — comportement attendu, pas un bug.
   */
  async findAll(actor: AuthenticatedUser, filters: AuditTrailFilters) {
    const { missionId, table, action, page, perPage } = filters;
    const where = {
      ...(actor.roleCode === 'super_admin' ? {} : { cabinet_id: actor.cabinetId }),
      ...(missionId && { mission_id: missionId }),
      ...(table && { table_concernee: table }),
      ...(action && { action }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.audit_trail.count({ where }),
      this.prisma.audit_trail.findMany({
        where,
        include: { ref_type_activite: true, utilisateur: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return { total, page, perPage, items };
  }
}
