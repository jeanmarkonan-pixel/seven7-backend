import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@auditflow/db';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from '../missions/missions.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ConcludeMissionCycleDto } from './dto/conclude-mission-cycle.dto';
import type { CreateMissionCycleDto } from './dto/create-mission-cycle.dto';
import type { UpdateMissionCycleDto } from './dto/update-mission-cycle.dto';

@Injectable()
export class MissionCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missions: MissionsService,
  ) {}

  private async resolveCycle(code: string) {
    const cycle = await this.prisma.ref_cycle_isa.findUnique({ where: { code } });
    if (!cycle) throw new BadRequestException(`Cycle ISA inconnu : ${code}`);
    return cycle;
  }

  private async assertResponsableDansCabinet(userId: string, cabinetId: string): Promise<void> {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, cabinet_id: cabinetId, deleted_at: null, est_actif: true },
    });
    if (!user) {
      throw new BadRequestException('responsableId : utilisateur introuvable dans ce cabinet');
    }
  }

  /** Valide que la mission est visible par l'appelant — lève NotFoundException sinon. */
  private async assertMissionVisible(missionId: string, actor: AuthenticatedUser) {
    return this.missions.findOne(missionId, actor);
  }

  async create(missionId: string, actor: AuthenticatedUser, dto: CreateMissionCycleDto) {
    const mission = await this.assertMissionVisible(missionId, actor);
    const cycle = await this.resolveCycle(dto.cycleCode);

    if (dto.responsableId) {
      await this.assertResponsableDansCabinet(dto.responsableId, mission.cabinet_id);
    }

    try {
      return await this.prisma.mission_cycle.create({
        data: {
          mission_id: missionId,
          cycle_id: cycle.id,
          responsable_id: dto.responsableId,
          materielite: dto.materialite,
          risque_inherent: dto.risqueInherent,
          risque_controle: dto.risqueControle,
          risque_detection: dto.risqueDetection,
          risque_global: dto.risqueGlobal,
          approche: dto.approche,
        },
        include: { ref_cycle_isa: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Le cycle "${dto.cycleCode}" est déjà ouvert sur cette mission`);
      }
      throw err;
    }
  }

  async findAll(missionId: string, actor: AuthenticatedUser) {
    await this.assertMissionVisible(missionId, actor);
    return this.prisma.mission_cycle.findMany({
      where: { mission_id: missionId },
      include: { ref_cycle_isa: true },
      orderBy: { ref_cycle_isa: { ordre: 'asc' } },
    });
  }

  /**
   * Retrouve un cycle par son seul id, sans connaître à l'avance la mission
   * ni le cabinet — utilisé par TestsService, dont les routes n'imbriquent
   * que mission_cycle_id, pas mission_id. La visibilité tenant est vérifiée
   * via mission.cabinet_id plutôt que via un missionId fourni côté client.
   */
  async findByIdOnly(id: string, actor: AuthenticatedUser) {
    const cycle = await this.prisma.mission_cycle.findFirst({
      where: {
        id,
        mission: {
          deleted_at: null,
          ...(actor.roleCode === 'super_admin' ? {} : { cabinet_id: actor.cabinetId }),
        },
      },
      include: { ref_cycle_isa: true, mission: true },
    });
    if (!cycle) {
      throw new NotFoundException(`Cycle ${id} introuvable`);
    }
    return cycle;
  }

  async findOne(missionId: string, id: string, actor: AuthenticatedUser) {
    await this.assertMissionVisible(missionId, actor);
    const cycle = await this.prisma.mission_cycle.findFirst({
      where: { id, mission_id: missionId },
      include: { ref_cycle_isa: true },
    });
    if (!cycle) {
      throw new NotFoundException(`Cycle ${id} introuvable sur cette mission`);
    }
    return cycle;
  }

  async update(missionId: string, id: string, actor: AuthenticatedUser, dto: UpdateMissionCycleDto) {
    const mission = await this.assertMissionVisible(missionId, actor);
    await this.findOne(missionId, id, actor);

    const cycle = dto.cycleCode ? await this.resolveCycle(dto.cycleCode) : undefined;
    if (dto.responsableId) {
      await this.assertResponsableDansCabinet(dto.responsableId, mission.cabinet_id);
    }

    return this.prisma.mission_cycle.update({
      where: { id },
      data: {
        ...(cycle && { cycle_id: cycle.id }),
        ...(dto.responsableId !== undefined && { responsable_id: dto.responsableId }),
        ...(dto.materialite !== undefined && { materielite: dto.materialite }),
        ...(dto.risqueInherent !== undefined && { risque_inherent: dto.risqueInherent }),
        ...(dto.risqueControle !== undefined && { risque_controle: dto.risqueControle }),
        ...(dto.risqueDetection !== undefined && { risque_detection: dto.risqueDetection }),
        ...(dto.risqueGlobal !== undefined && { risque_global: dto.risqueGlobal }),
        ...(dto.approche !== undefined && { approche: dto.approche }),
        ...(dto.statut && { statut: dto.statut }),
        updated_at: new Date(),
      },
      include: { ref_cycle_isa: true },
    });
  }

  async conclude(missionId: string, id: string, actor: AuthenticatedUser, dto: ConcludeMissionCycleDto) {
    await this.assertMissionVisible(missionId, actor);
    await this.findOne(missionId, id, actor);

    return this.prisma.mission_cycle.update({
      where: { id },
      data: {
        conclusion: dto.conclusion,
        conclusion_par: actor.id,
        conclusion_date: new Date(),
        statut: 'termine',
      },
      include: { ref_cycle_isa: true },
    });
  }
}
