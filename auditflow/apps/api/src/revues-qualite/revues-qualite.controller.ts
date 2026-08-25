import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateRevueDto } from './dto/create-revue.dto';
import { UpdateRevueDto } from './dto/update-revue.dto';
import { RevuesQualiteService } from './revues-qualite.service';

// Mêmes rôles que /rapports en lecture (senior/junior : aucun accès) —
// la revue qualité est un sous-objet du rapport, pas un module distinct
// de la matrice §5.1.
const ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager'];

@ApiTags('revues-qualite')
@ApiBearerAuth()
@Controller()
export class RevuesQualiteController {
  constructor(private readonly revues: RevuesQualiteService) {}

  @Post('rapports/:rapportId/revues')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Enregistre une revue qualité sur un rapport (par défaut, pour l’appelant lui-même)' })
  create(
    @Param('rapportId', ParseUUIDPipe) rapportId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRevueDto,
  ) {
    return this.revues.create(rapportId, actor, dto);
  }

  @Get('rapports/:rapportId/revues')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Liste les revues qualité d’un rapport' })
  findAll(@Param('rapportId', ParseUUIDPipe) rapportId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.revues.findAll(rapportId, actor);
  }

  @Get('revues-qualite/:id')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Détail d’une revue qualité' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.revues.findOne(id, actor);
  }

  @Patch('revues-qualite/:id')
  @Roles(...ROLES)
  @ApiOperation({ summary: 'Fait avancer sa propre revue (statut, commentaires, points d’attention)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateRevueDto,
  ) {
    return this.revues.update(id, actor, dto);
  }
}
