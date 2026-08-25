import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Premier module métier : les cabinets d'audit, racine du modèle multi-tenant.
 * Chaque mission, utilisateur et document est rattaché à un cabinet — c'est la
 * frontière d'isolation exigée par le plan de conformité (§4.3, IDOR).
 *
 * La table pratique la suppression logique (deleted_at) : le schéma conserve
 * 10 ans d'historique OHADA, donc rien n'est jamais supprimé physiquement.
 * Toute lecture doit donc écarter explicitement les lignes supprimées.
 */
@Injectable()
export class CabinetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Un utilisateur ne voit que son propre cabinet — seul super_admin (niveau
   * 100, vérifié par le contrôleur) échappe à cette règle et voit tout.
   */
  findAllVisibleTo(cabinetId: string, isSuperAdmin: boolean) {
    return this.prisma.cabinet.findMany({
      where: { deleted_at: null, ...(isSuperAdmin ? {} : { id: cabinetId }) },
      orderBy: { nom: 'asc' },
    });
  }

  findOneIfVisibleTo(id: string, cabinetId: string, isSuperAdmin: boolean) {
    return this.prisma.cabinet.findFirst({
      where: { id, deleted_at: null, ...(isSuperAdmin ? {} : { id: cabinetId }) },
    });
  }
}
