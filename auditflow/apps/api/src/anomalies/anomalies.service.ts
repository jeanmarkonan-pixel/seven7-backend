import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from '../missions/missions.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAnomalieDto } from './dto/create-anomalie.dto';
import type { UpdateAnomalieDto } from './dto/update-anomalie.dto';

@Injectable()
export class AnomaliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missions: MissionsService,
  ) {}

  private async resolveStatut(code: string) {
    const statut = await this.prisma.ref_statut_anomalie.findUnique({ where: { code } });
    if (!statut) throw new BadRequestException(`Statut d'anomalie inconnu : ${code}`);
    return statut;
  }

  private async assertUserDansCabinet(userId: string, cabinetId: string, champ: string): Promise<void> {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, cabinet_id: cabinetId, deleted_at: null, est_actif: true },
    });
    if (!user) {
      throw new BadRequestException(`${champ} : utilisateur introuvable dans ce cabinet`);
    }
  }

  async create(missionId: string, actor: AuthenticatedUser, dto: CreateAnomalieDto) {
    const mission = await this.missions.findOne(missionId, actor);
    const statutInitial = await this.resolveStatut('ouverte');

    if (dto.missionCycleId) {
      const cycle = await this.prisma.mission_cycle.findFirst({
        where: { id: dto.missionCycleId, mission_id: missionId },
      });
      if (!cycle) throw new BadRequestException('missionCycleId : cycle introuvable sur cette mission');
    }
    if (dto.testExecutionId) {
      const test = await this.prisma.test_execution.findFirst({
        where: { id: dto.testExecutionId, mission_cycle: { mission_id: missionId } },
      });
      if (!test) throw new BadRequestException('testExecutionId : test introuvable sur cette mission');
    }
    if (dto.assigneeA) {
      await this.assertUserDansCabinet(dto.assigneeA, mission.cabinet_id, 'assigneeA');
    }

    return this.prisma.anomalie.create({
      data: {
        mission_id: missionId,
        mission_cycle_id: dto.missionCycleId,
        test_execution_id: dto.testExecutionId,
        statut_id: statutInitial.id,
        // Valeur jetable : trg_anomalie_reference (BEFORE INSERT) la
        // remplace inconditionnellement avant l'écriture. Requise ici
        // uniquement parce que le schéma Prisma introspecté marque la
        // colonne comme non nullable sans valeur par défaut connue côté
        // client — la vraie valeur par défaut vit dans le trigger SQL,
        // invisible depuis l'introspection.
        reference: '__genere_par_trigger__',
        titre: dto.titre,
        description: dto.description,
        assertion_concernee: dto.assertionConcernee,
        montant_impact: dto.montantImpact,
        pourcentage_impact: dto.pourcentageImpact,
        impact_significatif: dto.impactSignificatif ?? false,
        assignee_a: dto.assigneeA,
        ouverte_par: actor.id,
      },
      include: { ref_statut_anomalie: true },
    });
  }

  async findAll(missionId: string, actor: AuthenticatedUser) {
    await this.missions.findOne(missionId, actor);
    return this.prisma.anomalie.findMany({
      where: { mission_id: missionId },
      include: { ref_statut_anomalie: true },
      orderBy: { date_ouverture: 'desc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const anomalie = await this.prisma.anomalie.findUnique({
      where: { id },
      include: { ref_statut_anomalie: true, mission: true },
    });
    if (!anomalie) return null;
    if (actor.roleCode !== 'super_admin' && anomalie.mission.cabinet_id !== actor.cabinetId) return null;
    return anomalie;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const anomalie = await this.findVisible(id, actor);
    if (!anomalie) {
      throw new NotFoundException(`Anomalie ${id} introuvable`);
    }
    return anomalie;
  }

  /**
   * Toute modification de statut est consignée dans anomalie_historique —
   * table dédiée du schéma, distincte de audit_trail, et explicitement
   * exigée par le plan de conformité (§7.1 : "Modification d'anomalie"
   * fait partie des événements à journaliser obligatoirement, 10 ans,
   * immuable). update() + insertion de l'historique dans UNE transaction :
   * sans ça, une panne entre les deux appels laisserait le statut changé
   * sans trace de qui l'a fait ni pourquoi — exactement ce que la table
   * existe pour empêcher.
   */
  async update(id: string, actor: AuthenticatedUser, dto: UpdateAnomalieDto) {
    const anomalie = await this.findOne(id, actor);

    if (dto.assigneeA) {
      await this.assertUserDansCabinet(dto.assigneeA, anomalie.mission.cabinet_id, 'assigneeA');
    }

    const nouveauStatut = dto.statutCode ? await this.resolveStatut(dto.statutCode) : undefined;
    const changeDeStatut = nouveauStatut && nouveauStatut.id !== anomalie.statut_id;
    const cloture = nouveauStatut?.code === 'close';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.anomalie.update({
        where: { id },
        data: {
          ...(dto.titre && { titre: dto.titre }),
          ...(dto.description && { description: dto.description }),
          ...(dto.assertionConcernee !== undefined && { assertion_concernee: dto.assertionConcernee }),
          ...(dto.montantImpact !== undefined && { montant_impact: dto.montantImpact }),
          ...(dto.pourcentageImpact !== undefined && { pourcentage_impact: dto.pourcentageImpact }),
          ...(dto.impactSignificatif !== undefined && { impact_significatif: dto.impactSignificatif }),
          ...(dto.assigneeA !== undefined && { assignee_a: dto.assigneeA }),
          ...(nouveauStatut && { statut_id: nouveauStatut.id }),
          ...(cloture && { close_par: actor.id, date_cloture: new Date(), conclusion: dto.conclusion }),
          updated_at: new Date(),
        },
        include: { ref_statut_anomalie: true },
      });

      if (changeDeStatut) {
        await tx.anomalie_historique.create({
          data: {
            anomalie_id: id,
            statut_precedent: anomalie.statut_id,
            statut_nouveau: nouveauStatut.id,
            commentaire: dto.commentaire,
            modifie_par: actor.id,
          },
        });
      }

      return updated;
    });
  }

  async historique(id: string, actor: AuthenticatedUser) {
    await this.findOne(id, actor);
    return this.prisma.anomalie_historique.findMany({
      where: { anomalie_id: id },
      include: {
        ref_statut_anomalie_anomalie_historique_statut_precedentToref_statut_anomalie: true,
        ref_statut_anomalie_anomalie_historique_statut_nouveauToref_statut_anomalie: true,
      },
      orderBy: { date_modification: 'asc' },
    });
  }
}
