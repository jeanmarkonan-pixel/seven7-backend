import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@auditflow/db';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ClientsService } from '../clients/clients.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMissionDto } from './dto/create-mission.dto';
import type { UpdateMissionDto } from './dto/update-mission.dto';

/** Niveau hiérarchique minimum attendu pour occuper chaque poste d'équipe. */
const NIVEAU_MIN_PAR_POSTE: Record<'associeId' | 'managerId' | 'seniorId' | 'juniorId', number> = {
  associeId: 80,
  managerId: 60,
  seniorId: 40,
  juniorId: 20,
};

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
  ) {}

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return actor.roleCode === 'super_admin';
  }

  private async resolveType(code: string) {
    const type = await this.prisma.ref_type_mission.findUnique({ where: { code } });
    if (!type) throw new BadRequestException(`Type de mission inconnu : ${code}`);
    return type;
  }

  private async resolveStatut(code: string) {
    const statut = await this.prisma.ref_statut_mission.findUnique({ where: { code } });
    if (!statut) throw new BadRequestException(`Statut de mission inconnu : ${code}`);
    return statut;
  }

  private async resolveOpinion(code: string) {
    const opinion = await this.prisma.ref_type_opinion.findUnique({ where: { code } });
    if (!opinion) throw new BadRequestException(`Type d'opinion inconnu : ${code}`);
    return opinion;
  }

  /**
   * Vérifie qu'un utilisateur assigné à un poste d'équipe appartient bien au
   * même cabinet (IDOR, §4.3) et tient au moins le niveau hiérarchique
   * attendu pour ce poste — un junior ne peut pas être déclaré associé
   * responsable, même si le champ associe_id accepte n'importe quel UUID
   * d'utilisateur au niveau base de données.
   */
  private async assertTeamMember(
    userId: string,
    cabinetId: string,
    poste: keyof typeof NIVEAU_MIN_PAR_POSTE,
  ): Promise<void> {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, cabinet_id: cabinetId, deleted_at: null, est_actif: true },
      include: { ref_role_utilisateur: true },
    });
    if (!user) {
      throw new BadRequestException(`${poste} : utilisateur introuvable dans ce cabinet`);
    }
    if (user.ref_role_utilisateur.niveau < NIVEAU_MIN_PAR_POSTE[poste]) {
      throw new BadRequestException(
        `${poste} : ${user.prenom} ${user.nom} (${user.ref_role_utilisateur.libelle}) n'a pas le niveau requis pour ce poste`,
      );
    }
  }

  private assertDatesCoherentes(debut: string, fin: string): void {
    if (new Date(fin) <= new Date(debut)) {
      throw new BadRequestException("La fin d'exercice doit être postérieure au début d'exercice");
    }
  }

  async create(actor: AuthenticatedUser, dto: CreateMissionDto) {
    this.assertDatesCoherentes(dto.exerciceDebut, dto.exerciceFin);

    const cabinetId = actor.cabinetId;

    // client_id du body n'est valide que s'il appartient au cabinet de
    // l'appelant — sinon on pourrait rattacher une mission au client d'un
    // autre cabinet.
    await this.clients.findOne(dto.clientId, actor);

    const type = await this.resolveType(dto.typeMissionCode);
    const statut = await this.resolveStatut(dto.statutCode ?? 'prospect');

    const equipe: Array<[keyof typeof NIVEAU_MIN_PAR_POSTE, string | undefined]> = [
      ['associeId', dto.associeId],
      ['managerId', dto.managerId],
      ['seniorId', dto.seniorId],
      ['juniorId', dto.juniorId],
    ];
    for (const [poste, userId] of equipe) {
      if (userId) await this.assertTeamMember(userId, cabinetId, poste);
    }

    try {
      return await this.prisma.mission.create({
        data: {
          cabinet_id: cabinetId,
          client_id: dto.clientId,
          type_mission_id: type.id,
          statut_id: statut.id,
          reference: dto.reference,
          exercice_debut: new Date(dto.exerciceDebut),
          exercice_fin: new Date(dto.exerciceFin),
          date_debut_mission: dto.dateDebutMission ? new Date(dto.dateDebutMission) : undefined,
          date_fin_prevue: dto.dateFinPrevue ? new Date(dto.dateFinPrevue) : undefined,
          montant_honoraires: dto.montantHonoraires,
          devise: dto.devise ?? 'XOF',
          objectif: dto.objectif,
          associe_id: dto.associeId,
          manager_id: dto.managerId,
          senior_id: dto.seniorId,
          junior_id: dto.juniorId,
        },
        include: {
          client: true,
          ref_type_mission: true,
          ref_statut_mission: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`La référence "${dto.reference}" est déjà utilisée dans ce cabinet`);
      }
      throw err;
    }
  }

  findAll(actor: AuthenticatedUser) {
    return this.prisma.mission.findMany({
      where: {
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
      include: { client: true, ref_type_mission: true, ref_statut_mission: true },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    return this.prisma.mission.findFirst({
      where: {
        id,
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
      include: {
        client: true,
        ref_type_mission: true,
        ref_statut_mission: true,
        ref_type_opinion: true,
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const mission = await this.findVisible(id, actor);
    if (!mission) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    return mission;
  }

  async update(id: string, actor: AuthenticatedUser, dto: UpdateMissionDto) {
    const mission = await this.findVisible(id, actor);
    if (!mission) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }

    const exerciceDebut = dto.exerciceDebut ?? mission.exercice_debut.toISOString();
    const exerciceFin = dto.exerciceFin ?? mission.exercice_fin.toISOString();
    this.assertDatesCoherentes(exerciceDebut, exerciceFin);

    if (dto.clientId && dto.clientId !== mission.client_id) {
      await this.clients.findOne(dto.clientId, actor);
    }

    const type = dto.typeMissionCode ? await this.resolveType(dto.typeMissionCode) : undefined;
    const statut = dto.statutCode ? await this.resolveStatut(dto.statutCode) : undefined;
    const opinion = dto.typeOpinionCode ? await this.resolveOpinion(dto.typeOpinionCode) : undefined;

    const equipe: Array<[keyof typeof NIVEAU_MIN_PAR_POSTE, string | undefined]> = [
      ['associeId', dto.associeId],
      ['managerId', dto.managerId],
      ['seniorId', dto.seniorId],
      ['juniorId', dto.juniorId],
    ];
    for (const [poste, userId] of equipe) {
      if (userId) await this.assertTeamMember(userId, mission.cabinet_id, poste);
    }

    return this.prisma.mission.update({
      where: { id },
      data: {
        ...(dto.clientId && { client_id: dto.clientId }),
        ...(type && { type_mission_id: type.id }),
        ...(statut && { statut_id: statut.id }),
        ...(opinion && { type_opinion_id: opinion.id }),
        ...(dto.reference && { reference: dto.reference }),
        ...(dto.exerciceDebut && { exercice_debut: new Date(dto.exerciceDebut) }),
        ...(dto.exerciceFin && { exercice_fin: new Date(dto.exerciceFin) }),
        ...(dto.dateDebutMission !== undefined && {
          date_debut_mission: dto.dateDebutMission ? new Date(dto.dateDebutMission) : null,
        }),
        ...(dto.dateFinPrevue !== undefined && {
          date_fin_prevue: dto.dateFinPrevue ? new Date(dto.dateFinPrevue) : null,
        }),
        ...(dto.dateFinReelle !== undefined && {
          date_fin_reelle: dto.dateFinReelle ? new Date(dto.dateFinReelle) : null,
        }),
        ...(dto.dateSignatureRapport !== undefined && {
          date_signature_rapport: dto.dateSignatureRapport ? new Date(dto.dateSignatureRapport) : null,
        }),
        ...(dto.montantHonoraires !== undefined && { montant_honoraires: dto.montantHonoraires }),
        ...(dto.devise && { devise: dto.devise }),
        ...(dto.objectif !== undefined && { objectif: dto.objectif }),
        ...(dto.associeId !== undefined && { associe_id: dto.associeId }),
        ...(dto.managerId !== undefined && { manager_id: dto.managerId }),
        ...(dto.seniorId !== undefined && { senior_id: dto.seniorId }),
        ...(dto.juniorId !== undefined && { junior_id: dto.juniorId }),
        updated_at: new Date(),
      },
      include: { client: true, ref_type_mission: true, ref_statut_mission: true, ref_type_opinion: true },
    });
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const mission = await this.findVisible(id, actor);
    if (!mission) {
      throw new NotFoundException(`Mission ${id} introuvable`);
    }
    // Suppression logique uniquement — archivage OHADA 10 ans (duree_conservation_ans).
    await this.prisma.mission.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
