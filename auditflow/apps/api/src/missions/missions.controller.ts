import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { MissionsService } from './missions.service';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Plan de conformité §5.1 : associe n'a que "Lecture" sur les missions
// (Manager et Senior, pourtant de niveau hiérarchique inférieur, ont CRUD —
// une hiérarchie de niveau ne suffit donc pas ici, d'où des listes de rôles
// explicites plutôt qu'un seuil). junior a un "CRUD (limité)" non défini
// par le document : exclu de l'écriture par prudence plutôt que deviné.
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];
const DELETE_ROLES = ['super_admin', 'admin_cabinet'];

@ApiTags('missions')
@ApiBearerAuth()
@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Crée une mission d’audit' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateMissionDto) {
    return this.missions.create(actor, dto);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les missions visibles par l’appelant' })
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.missions.findAll(actor);
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Détail d’une mission' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.missions.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie une mission (équipe, statut, opinion, dates...)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missions.update(id, actor, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...DELETE_ROLES)
  @ApiOperation({ summary: 'Supprime (logiquement) une mission' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.missions.remove(id, actor);
  }
}
