import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AnomaliesService } from './anomalies.service';
import { CreateAnomalieDto } from './dto/create-anomalie.dto';
import { UpdateAnomalieDto } from './dto/update-anomalie.dto';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Plan de conformité §5.1, colonne Anomalies : associe a CRUD ici (à la
// différence de Missions/Tests où il n'a que Lecture), junior n'a que
// Lecture (à la différence de Tests où il a CRUD complet). L'inverse exact
// du pattern observé sur /tests — d'où une liste de rôles propre à ce
// contrôleur, pas une constante partagée entre modules.
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior'];

@ApiTags('anomalies')
@ApiBearerAuth()
@Controller()
export class AnomaliesController {
  constructor(private readonly anomalies: AnomaliesService) {}

  @Post('missions/:missionId/anomalies')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Ouvre une anomalie sur une mission' })
  create(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAnomalieDto,
  ) {
    return this.anomalies.create(missionId, actor, dto);
  }

  @Get('missions/:missionId/anomalies')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les anomalies d’une mission' })
  findAll(@Param('missionId', ParseUUIDPipe) missionId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.anomalies.findAll(missionId, actor);
  }

  @Get('anomalies/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Détail d’une anomalie' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.anomalies.findOne(id, actor);
  }

  @Patch('anomalies/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie une anomalie — tout changement de statut est consigné dans son historique' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateAnomalieDto,
  ) {
    return this.anomalies.update(id, actor, dto);
  }

  @Get('anomalies/:id/historique')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Historique complet des changements de statut de l’anomalie' })
  historique(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.anomalies.historique(id, actor);
  }
}
