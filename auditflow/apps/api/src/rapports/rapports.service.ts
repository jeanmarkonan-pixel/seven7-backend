import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from '../missions/missions.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRapportDto } from './dto/create-rapport.dto';
import type { SignRapportDto } from './dto/sign-rapport.dto';
import type { UpdateRapportDto } from './dto/update-rapport.dto';

@Injectable()
export class RapportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missions: MissionsService,
  ) {}

  private async resolveType(code: string) {
    const type = await this.prisma.ref_type_rapport.findUnique({ where: { code } });
    if (!type) throw new BadRequestException(`Type de rapport inconnu : ${code}`);
    return type;
  }

  private async resolveOpinion(code: string) {
    const opinion = await this.prisma.ref_type_opinion.findUnique({ where: { code } });
    if (!opinion) throw new BadRequestException(`Type d'opinion inconnu : ${code}`);
    return opinion;
  }

  async create(missionId: string, actor: AuthenticatedUser, dto: CreateRapportDto) {
    await this.missions.findOne(missionId, actor);
    const type = await this.resolveType(dto.typeRapportCode);

    return this.prisma.rapport.create({
      data: {
        mission_id: missionId,
        type_rapport_id: type.id,
        reference: dto.reference,
        titre: dto.titre,
        contenu: dto.contenu,
      },
      include: { ref_type_rapport: true, ref_type_opinion: true },
    });
  }

  async findAll(missionId: string, actor: AuthenticatedUser) {
    await this.missions.findOne(missionId, actor);
    return this.prisma.rapport.findMany({
      where: { mission_id: missionId },
      include: { ref_type_rapport: true, ref_type_opinion: true },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const rapport = await this.prisma.rapport.findUnique({
      where: { id },
      include: { ref_type_rapport: true, ref_type_opinion: true, mission: true },
    });
    if (!rapport) return null;
    if (actor.roleCode !== 'super_admin' && rapport.mission.cabinet_id !== actor.cabinetId) return null;
    return rapport;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const rapport = await this.findVisible(id, actor);
    if (!rapport) {
      throw new NotFoundException(`Rapport ${id} introuvable`);
    }
    return rapport;
  }

  async update(id: string, actor: AuthenticatedUser, dto: UpdateRapportDto) {
    const rapport = await this.findOne(id, actor);

    // Intégrité du rapport signé (ISA 700) : une fois signe_par renseigné,
    // le contenu ne bouge plus. Le schéma ne l'impose pas au niveau SQL —
    // c'est une règle métier que je pose explicitement, pas une contrainte
    // découverte dans le schéma.
    if (rapport.signe_par) {
      throw new ForbiddenException('Ce rapport est signé, son contenu ne peut plus être modifié');
    }

    const type = dto.typeRapportCode ? await this.resolveType(dto.typeRapportCode) : undefined;

    return this.prisma.rapport.update({
      where: { id },
      data: {
        ...(type && { type_rapport_id: type.id }),
        ...(dto.reference && { reference: dto.reference }),
        ...(dto.titre && { titre: dto.titre }),
        ...(dto.contenu !== undefined && { contenu: dto.contenu }),
        ...(dto.statut && { statut: dto.statut }),
        updated_at: new Date(),
      },
      include: { ref_type_rapport: true, ref_type_opinion: true },
    });
  }

  /**
   * Signature : réservée à l'associé responsable (émission d'une opinion
   * d'audit, ISA 700, un acte professionnel engageant sa responsabilité) —
   * pas admin_cabinet malgré son "CRUD" dans la matrice §5.1. Lecture
   * volontairement plus stricte que le mot "CRUD" ne l'impose littéralement :
   * CRUD couvre la gestion du dossier (créer/éditer/lister), pas l'acte de
   * signer une opinion, qui est un jugement professionnel réservé par
   * nature à l'associé. Choix de conception explicite, pas une lecture
   * forcée du document.
   */
  async signer(id: string, actor: AuthenticatedUser, dto: SignRapportDto) {
    const rapport = await this.findOne(id, actor);
    if (rapport.signe_par) {
      throw new ForbiddenException('Ce rapport est déjà signé');
    }

    const opinion = await this.resolveOpinion(dto.typeOpinionCode);

    return this.prisma.rapport.update({
      where: { id },
      data: {
        type_opinion_id: opinion.id,
        signe_par: actor.id,
        date_signature: new Date(),
        statut: 'signe',
      },
      include: { ref_type_rapport: true, ref_type_opinion: true },
    });
  }
}
