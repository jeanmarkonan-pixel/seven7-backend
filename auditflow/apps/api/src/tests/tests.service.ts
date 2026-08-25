import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionCyclesService } from '../mission-cycles/mission-cycles.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTestDto } from './dto/create-test.dto';
import type { RecordExecutionDto } from './dto/record-execution.dto';

@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missionCycles: MissionCyclesService,
  ) {}

  private async resolveStatut(code: string) {
    const statut = await this.prisma.ref_statut_test.findUnique({ where: { code } });
    if (!statut) throw new BadRequestException(`Statut de test inconnu : ${code}`);
    return statut;
  }

  async create(missionCycleId: string, actor: AuthenticatedUser, dto: CreateTestDto) {
    await this.missionCycles.findByIdOnly(missionCycleId, actor);
    const statutInitial = await this.resolveStatut('non_commence');

    if (dto.programmeId) {
      const programme = await this.prisma.programme_travail.findUnique({ where: { id: dto.programmeId } });
      if (!programme) {
        throw new BadRequestException(`Programme de travail introuvable : ${dto.programmeId}`);
      }
      return this.prisma.withActor(actor, (tx) => tx.test_execution.create({
        data: {
          mission_cycle_id: missionCycleId,
          programme_id: programme.id,
          type_test_id: programme.type_test_id,
          statut_id: statutInitial.id,
          reference: dto.reference,
          objectif: programme.objectif,
          procedure: programme.procedure,
          assertions: programme.assertions,
          echantillon_taille: dto.echantillonTaille ?? programme.echantillon_min,
        },
        include: { ref_type_test: true, ref_statut_test: true, programme_travail: true },
      }));
    }

    // Test libre : typeTestCode/objectif/procedure sont requis par le DTO
    // (ValidateIf) quand programmeId est absent, donc non-null ici.
    const type = await this.prisma.ref_type_test.findUnique({ where: { code: dto.typeTestCode } });
    if (!type) {
      throw new BadRequestException(`Type de test inconnu : ${dto.typeTestCode}`);
    }

    return this.prisma.withActor(actor, (tx) => tx.test_execution.create({
      data: {
        mission_cycle_id: missionCycleId,
        type_test_id: type.id,
        statut_id: statutInitial.id,
        reference: dto.reference,
        objectif: dto.objectif!,
        procedure: dto.procedure!,
        echantillon_taille: dto.echantillonTaille,
      },
      include: { ref_type_test: true, ref_statut_test: true },
    }));
  }

  async findAll(missionCycleId: string, actor: AuthenticatedUser) {
    await this.missionCycles.findByIdOnly(missionCycleId, actor);
    return this.prisma.test_execution.findMany({
      where: { mission_cycle_id: missionCycleId },
      include: { ref_type_test: true, ref_statut_test: true },
      orderBy: { ordre: 'asc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const test = await this.prisma.test_execution.findUnique({
      where: { id },
      include: { ref_type_test: true, ref_statut_test: true, mission_cycle: { include: { mission: true } } },
    });
    if (!test) return null;
    const cabinetId = test.mission_cycle.mission.cabinet_id;
    if (actor.roleCode !== 'super_admin' && cabinetId !== actor.cabinetId) return null;
    return test;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const test = await this.findVisible(id, actor);
    if (!test) {
      throw new NotFoundException(`Test ${id} introuvable`);
    }
    return test;
  }

  /** Exécution : quiconque a le droit d'écrire sur les tests peut enregistrer le résultat de SON propre test. */
  async recordExecution(id: string, actor: AuthenticatedUser, dto: RecordExecutionDto) {
    const test = await this.findOne(id, actor);
    const statut = await this.resolveStatut(dto.statutCode);

    return this.prisma.withActor(actor, (tx) => tx.test_execution.update({
      where: { id: test.id },
      data: {
        statut_id: statut.id,
        resultat: dto.resultat,
        score: dto.score,
        echantillon_defaut: dto.echantillonDefaut,
        conclusion: dto.conclusion,
        execute_par: actor.id,
        date_execution: new Date(),
        updated_at: new Date(),
      },
      include: { ref_type_test: true, ref_statut_test: true },
    }));
  }

  /**
   * Revue : séparation des tâches (ISA 220) — un test doit être revu par
   * quelqu'un d'autre que qui l'a exécuté, et par un profil au moins senior
   * (niveau >= 40). Le champ permissions.revue de ref_role_utilisateur n'est
   * PAS utilisé ici : il contient le nom du rôle lui-même ("senior" pour le
   * rôle senior), pas une règle de délégation exploitable — voir la mise en
   * garde dans JwtPayload. La règle ci-dessous est un choix de conception
   * explicite, pas une lecture du schéma.
   */
  async review(id: string, actor: AuthenticatedUser) {
    const test = await this.findOne(id, actor);

    if (actor.roleNiveau < 40) {
      throw new ForbiddenException('La revue d’un test requiert un profil senior ou supérieur');
    }
    if (test.execute_par === actor.id) {
      throw new ForbiddenException('Vous ne pouvez pas revoir un test que vous avez vous-même exécuté');
    }
    if (!test.execute_par) {
      throw new BadRequestException('Ce test n’a pas encore été exécuté — rien à revoir');
    }

    return this.prisma.withActor(actor, (tx) =>
      tx.test_execution.update({
        where: { id: test.id },
        data: { revu_par: actor.id, date_revue: new Date(), updated_at: new Date() },
        include: { ref_type_test: true, ref_statut_test: true },
      }),
    );
  }
}
