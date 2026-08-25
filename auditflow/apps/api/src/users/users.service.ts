import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@auditflow/db';

import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

/** Ne jamais renvoyer le hash, même bcrypt, dans une réponse API. */
function sansHash<T extends { mot_de_passe_hash: string }>(user: T): Omit<T, 'mot_de_passe_hash'> {
  const { mot_de_passe_hash: _hash, ...rest } = user;
  return rest;
}

/**
 * Gestion des comptes utilisateurs, réservée à admin_cabinet et super_admin
 * (MinNiveau(90) posé sur le contrôleur — cohérent avec la matrice RBAC du
 * plan de conformité §5.1, colonne "Admin").
 *
 * Deux règles de sécurité systématiques, au-delà du filtre par cabinet déjà
 * vu sur CabinetsService :
 *
 * 1. Anti-escalade : personne ne peut créer ou promouvoir un compte à un
 *    rôle plus élevé que le sien. Sans ça, un admin_cabinet (niveau 90)
 *    pourrait se créer un compte super_admin (niveau 100).
 * 2. Anti-auto-verrouillage : un administrateur ne peut pas se désactiver
 *    ou se supprimer lui-même via cet endpoint — ça doit passer par un
 *    autre admin, pour éviter qu'un cabinet à un seul admin se retrouve
 *    sans accès administrateur.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return actor.roleCode === 'super_admin';
  }

  private async resolveRole(roleCode: string) {
    const role = await this.prisma.ref_role_utilisateur.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new BadRequestException(`Rôle inconnu : ${roleCode}`);
    }
    return role;
  }

  private assertNoEscalation(actor: AuthenticatedUser, targetRoleNiveau: number) {
    if (targetRoleNiveau > actor.roleNiveau) {
      throw new ForbiddenException(
        'Impossible d’attribuer un rôle plus élevé que le vôtre',
      );
    }
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    const role = await this.resolveRole(dto.roleCode);
    this.assertNoEscalation(actor, role.niveau);

    // cabinetId du body n'est honoré que pour super_admin ; pour tout autre
    // rôle, le cabinet est toujours celui de l'appelant, jamais celui fourni
    // dans la requête (IDOR — plan de conformité §4.3).
    const cabinetId = this.isSuperAdmin(actor) && dto.cabinetId ? dto.cabinetId : actor.cabinetId;

    const passwordHash = await AuthService.hashPassword(dto.password);

    try {
      const created = await this.prisma.utilisateur.create({
        data: {
          cabinet_id: cabinetId,
          role_id: role.id,
          email: dto.email,
          mot_de_passe_hash: passwordHash,
          nom: dto.nom,
          prenom: dto.prenom,
          telephone: dto.telephone,
          fonction: dto.fonction,
        },
        include: { ref_role_utilisateur: true },
      });
      return sansHash(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet email dans ce cabinet');
      }
      throw err;
    }
  }

  async findAll(actor: AuthenticatedUser) {
    const users = await this.prisma.utilisateur.findMany({
      where: {
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
      include: { ref_role_utilisateur: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    return users.map(sansHash);
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    return this.prisma.utilisateur.findFirst({
      where: {
        id,
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
      include: { ref_role_utilisateur: true },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const user = await this.findVisible(id, actor);
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    return sansHash(user);
  }

  async update(id: string, actor: AuthenticatedUser, dto: UpdateUserDto) {
    const target = await this.findVisible(id, actor);
    if (!target) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }

    if (target.id === actor.id && dto.estActif === false) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
    }

    let roleId: number | undefined;
    if (dto.roleCode) {
      const role = await this.resolveRole(dto.roleCode);
      this.assertNoEscalation(actor, role.niveau);
      roleId = role.id;
    }

    const passwordHash = dto.password ? await AuthService.hashPassword(dto.password) : undefined;

    try {
      const updated = await this.prisma.utilisateur.update({
        where: { id },
        data: {
          ...(dto.email && { email: dto.email }),
          ...(dto.nom && { nom: dto.nom }),
          ...(dto.prenom && { prenom: dto.prenom }),
          ...(dto.telephone !== undefined && { telephone: dto.telephone }),
          ...(dto.fonction !== undefined && { fonction: dto.fonction }),
          ...(dto.estActif !== undefined && { est_actif: dto.estActif }),
          ...(roleId !== undefined && { role_id: roleId }),
          ...(passwordHash && { mot_de_passe_hash: passwordHash }),
          updated_at: new Date(),
        },
        include: { ref_role_utilisateur: true },
      });
      return sansHash(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet email dans ce cabinet');
      }
      throw err;
    }
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const target = await this.findVisible(id, actor);
    if (!target) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    if (target.id === actor.id) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Suppression logique uniquement : le schéma conserve 10 ans
    // d'historique OHADA, rien n'est jamais supprimé physiquement.
    await this.prisma.utilisateur.update({
      where: { id },
      data: { deleted_at: new Date(), est_actif: false },
    });
  }
}
