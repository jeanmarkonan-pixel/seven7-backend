import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateRapportDto } from './dto/create-rapport.dto';
import { SignRapportDto } from './dto/sign-rapport.dto';
import { UpdateRapportDto } from './dto/update-rapport.dto';
import { RapportsService } from './rapports.service';

// Plan de conformité §5.1, colonne Rapports : senior et junior ont "—" —
// aucun accès, pas même en lecture. Le périmètre le plus restreint des
// modules construits jusqu'ici (tous les autres incluaient junior au
// moins en lecture).
const READ_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager'];
// "CRUD" au sens littéral de la table — création/édition du dossier,
// pas l'acte de signature (voir RapportsService.signer()).
const WRITE_ROLES = ['super_admin', 'admin_cabinet'];
const SIGN_ROLES = ['super_admin', 'associe'];

@ApiTags('rapports')
@ApiBearerAuth()
@Controller()
export class RapportsController {
  constructor(private readonly rapports: RapportsService) {}

  @Post('missions/:missionId/rapports')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Crée un rapport (brouillon) sur une mission' })
  create(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRapportDto,
  ) {
    return this.rapports.create(missionId, actor, dto);
  }

  @Get('missions/:missionId/rapports')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Liste les rapports d’une mission' })
  findAll(@Param('missionId', ParseUUIDPipe) missionId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.rapports.findAll(missionId, actor);
  }

  @Get('rapports/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Détail d’un rapport' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.rapports.findOne(id, actor);
  }

  @Patch('rapports/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie un rapport non signé' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateRapportDto,
  ) {
    return this.rapports.update(id, actor, dto);
  }

  @Post('rapports/:id/signer')
  @Roles(...SIGN_ROLES)
  @ApiOperation({ summary: 'Signe le rapport avec l’opinion émise — action définitive' })
  signer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SignRapportDto,
  ) {
    return this.rapports.signer(id, actor, dto);
  }
}
