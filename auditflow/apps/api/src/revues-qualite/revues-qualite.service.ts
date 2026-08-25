import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RapportsService } from '../rapports/rapports.service';
import type { CreateRevueDto } from './dto/create-revue.dto';
import type { UpdateRevueDto } from './dto/update-revue.dto';

const ASSIGNATION_LIBRE = ['super_admin', 'admin_cabinet'];

@Injectable()
export class RevuesQualiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rapports: RapportsService,
  ) {}

  async create(rapportId: string, actor: AuthenticatedUser, dto: CreateRevueDto) {
    const rapport = await this.rapports.findOne(rapportId, actor);

    // Seuls admin_cabinet/super_admin peuvent assigner une revue à un tiers ;
    // tout autre rôle ne peut enregistrer une revue qu'en son propre nom —
    // empêche de faire porter sa revue par quelqu'un d'autre.
    const relecteurId = dto.relecteurId ?? actor.id;
    if (relecteurId !== actor.id && !ASSIGNATION_LIBRE.includes(actor.roleCode)) {
      throw new ForbiddenException('Vous ne pouvez assigner une revue qu’à vous-même');
    }

    const relecteur = await this.prisma.utilisateur.findFirst({
      where: { id: relecteurId, cabinet_id: rapport.mission.cabinet_id, deleted_at: null, est_actif: true },
    });
    if (!relecteur) {
      throw new BadRequestException('relecteurId : utilisateur introuvable dans ce cabinet');
    }

    return this.prisma.revue_qualite.create({
      data: {
        rapport_id: rapportId,
        mission_id: rapport.mission_id,
        niveau: dto.niveau,
        relecteur_id: relecteurId,
        commentaires: dto.commentaires,
        points_attention: dto.pointsAttention ?? [],
      },
    });
  }

  async findAll(rapportId: string, actor: AuthenticatedUser) {
    await this.rapports.findOne(rapportId, actor);
    return this.prisma.revue_qualite.findMany({
      where: { rapport_id: rapportId },
      orderBy: { date_attribution: 'desc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const revue = await this.prisma.revue_qualite.findUnique({
      where: { id },
      include: { mission: true },
    });
    if (!revue) return null;
    if (actor.roleCode !== 'super_admin' && revue.mission.cabinet_id !== actor.cabinetId) return null;
    return revue;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const revue = await this.findVisible(id, actor);
    if (!revue) {
      throw new NotFoundException(`Revue ${id} introuvable`);
    }
    return revue;
  }

  /** Seul le relecteur assigné (ou un admin) fait avancer SA revue — un tiers ne peut pas la clore à sa place. */
  async update(id: string, actor: AuthenticatedUser, dto: UpdateRevueDto) {
    const revue = await this.findOne(id, actor);
    if (revue.relecteur_id !== actor.id && !ASSIGNATION_LIBRE.includes(actor.roleCode)) {
      throw new ForbiddenException('Seul le relecteur assigné peut mettre à jour cette revue');
    }

    const enCours = revue.date_debut === null && dto.statut && dto.statut !== 'en_attente';
    const terminee = dto.statut === 'termine';

    return this.prisma.revue_qualite.update({
      where: { id },
      data: {
        ...(dto.statut && { statut: dto.statut }),
        ...(dto.commentaires !== undefined && { commentaires: dto.commentaires }),
        ...(dto.pointsAttention !== undefined && { points_attention: dto.pointsAttention }),
        ...(enCours && { date_debut: new Date() }),
        ...(terminee && { date_fin: new Date() }),
        updated_at: new Date(),
      },
    });
  }
}
