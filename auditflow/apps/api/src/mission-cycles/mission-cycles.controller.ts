import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConcludeMissionCycleDto } from './dto/conclude-mission-cycle.dto';
import { CreateMissionCycleDto } from './dto/create-mission-cycle.dto';
import { UpdateMissionCycleDto } from './dto/update-mission-cycle.dto';
import { MissionCyclesService } from './mission-cycles.service';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Ouvrir/paramétrer un cycle sur une mission est un acte de planification,
// pas d'exécution de test — même partition de rôles que /missions (§5.1
// colonne Missions), pas la colonne Tests. Voir tests.controller.ts pour
// la nuance inverse (junior a CRUD complet sur les tests eux-mêmes).
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];

@ApiTags('mission-cycles')
@ApiBearerAuth()
@Controller('missions/:missionId/cycles')
export class MissionCyclesController {
  constructor(private readonly cycles: MissionCyclesService) {}

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Ouvre un cycle ISA sur une mission' })
  create(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateMissionCycleDto,
  ) {
    return this.cycles.create(missionId, actor, dto);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les cycles ouverts sur une mission' })
  findAll(@Param('missionId', ParseUUIDPipe) missionId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.cycles.findAll(missionId, actor);
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Détail d’un cycle' })
  findOne(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cycles.findOne(missionId, id, actor);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie les paramètres d’un cycle (risques, responsable, statut...)' })
  update(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateMissionCycleDto,
  ) {
    return this.cycles.update(missionId, id, actor, dto);
  }

  @Post(':id/conclure')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Conclut un cycle (conclusion motivée, horodatée, attribuée à l’appelant)' })
  conclude(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ConcludeMissionCycleDto,
  ) {
    return this.cycles.conclude(missionId, id, actor, dto);
  }
}
