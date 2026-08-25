import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Écriture réservée aux rôles ayant explicitement CRUD dans le plan de
// conformité §5.1 : associe n'a que "Lecture", junior a un "CRUD (limité)"
// non défini par le document — exclus des deux par prudence plutôt que
// de deviner ce que "limité" recouvre.
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Crée un client audité dans le cabinet de l’appelant' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.clients.create(actor, dto);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les clients visibles par l’appelant' })
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.clients.findAll(actor);
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Détail d’un client' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.clients.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie un client' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(id, actor, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('super_admin', 'admin_cabinet')
  @ApiOperation({ summary: 'Supprime (logiquement) un client' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.clients.remove(id, actor);
  }
}
