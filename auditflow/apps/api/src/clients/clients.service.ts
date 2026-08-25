import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClientDto } from './dto/create-client.dto';
import type { UpdateClientDto } from './dto/update-client.dto';

/**
 * Clients audités, toujours rattachés à un cabinet. Même règle d'isolation
 * que cabinet/utilisateur : un cabinet ne voit jamais les clients d'un autre
 * (plan de conformité §4.3, IDOR) ; super_admin seul voit tout.
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return actor.roleCode === 'super_admin';
  }

  create(actor: AuthenticatedUser, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        cabinet_id: actor.cabinetId,
        raison_sociale: dto.raisonSociale,
        forme_juridique: dto.formeJuridique,
        rccm: dto.rccm,
        ifu: dto.ifu,
        secteur_activite: dto.secteurActivite,
        ville: dto.ville,
        email: dto.email,
        contact_nom: dto.contactNom,
        contact_email: dto.contactEmail,
      },
    });
  }

  findAll(actor: AuthenticatedUser) {
    return this.prisma.client.findMany({
      where: {
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
      orderBy: { raison_sociale: 'asc' },
    });
  }

  /** Utilisé aussi par MissionsService pour valider qu'un client_id appartient bien au cabinet. */
  async findVisible(id: string, actor: AuthenticatedUser) {
    return this.prisma.client.findFirst({
      where: {
        id,
        deleted_at: null,
        ...(this.isSuperAdmin(actor) ? {} : { cabinet_id: actor.cabinetId }),
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const client = await this.findVisible(id, actor);
    if (!client) {
      throw new NotFoundException(`Client ${id} introuvable`);
    }
    return client;
  }

  async update(id: string, actor: AuthenticatedUser, dto: UpdateClientDto) {
    await this.findOne(id, actor);
    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.raisonSociale && { raison_sociale: dto.raisonSociale }),
        ...(dto.formeJuridique !== undefined && { forme_juridique: dto.formeJuridique }),
        ...(dto.rccm !== undefined && { rccm: dto.rccm }),
        ...(dto.ifu !== undefined && { ifu: dto.ifu }),
        ...(dto.secteurActivite !== undefined && { secteur_activite: dto.secteurActivite }),
        ...(dto.ville !== undefined && { ville: dto.ville }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.contactNom !== undefined && { contact_nom: dto.contactNom }),
        ...(dto.contactEmail !== undefined && { contact_email: dto.contactEmail }),
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findOne(id, actor);
    await this.prisma.client.update({
      where: { id },
      data: { deleted_at: new Date(), statut: 'inactif' },
    });
  }
}
