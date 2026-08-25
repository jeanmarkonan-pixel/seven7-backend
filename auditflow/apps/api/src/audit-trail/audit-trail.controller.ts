import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuditTrailService } from './audit-trail.service';

// La matrice §5.1 n'a pas de colonne "Audit Trail" — la piste d'audit
// complète est une vue administrative, rattachée à la colonne "Admin"
// (Admin Cabinet : "Utilisateurs cabinet", Super Admin : "Tout"). Personne
// d'autre n'y a accès, y compris associe/manager qui touchent pourtant aux
// rapports.
const ROLES = ['super_admin', 'admin_cabinet'];

@ApiTags('audit-trail')
@ApiBearerAuth()
@Controller('audit-trail')
@Roles(...ROLES)
export class AuditTrailController {
  constructor(private readonly auditTrail: AuditTrailService) {}

  @Get()
  @ApiQuery({ name: 'missionId', required: false })
  @ApiQuery({ name: 'table', required: false, description: 'mission, mission_cycle, test_execution, anomalie, document, rapport' })
  @ApiQuery({ name: 'action', required: false, description: 'CREATE, UPDATE, DELETE' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiOperation({ summary: 'Consulte la piste d’audit du cabinet (ou de tous les cabinets pour super_admin)' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('missionId') missionId?: string,
    @Query('table') table?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.auditTrail.findAll(actor, {
      missionId,
      table,
      action,
      page: Math.max(1, Number(page) || 1),
      perPage: Math.min(100, Math.max(1, Number(perPage) || 20)),
    });
  }
}
