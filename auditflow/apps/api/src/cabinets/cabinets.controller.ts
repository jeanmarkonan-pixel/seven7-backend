import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MinNiveau } from '../auth/decorators/min-niveau.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CabinetsService } from './cabinets.service';

@ApiTags('cabinets')
@ApiBearerAuth()
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinets: CabinetsService) {}

  @Get()
  @MinNiveau(60) // manager et au-dessus — junior/senior n'ont pas à lister les cabinets
  @ApiOperation({ summary: 'Liste les cabinets visibles par l’utilisateur' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cabinets.findAllVisibleTo(user.cabinetId, user.roleCode === 'super_admin');
  }

  @Get(':id')
  @MinNiveau(60)
  @ApiOperation({ summary: 'Détail d’un cabinet (le sien, sauf super_admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    const cabinet = await this.cabinets.findOneIfVisibleTo(
      id,
      user.cabinetId,
      user.roleCode === 'super_admin',
    );
    if (!cabinet) {
      throw new NotFoundException(`Cabinet ${id} introuvable`);
    }
    return cabinet;
  }
}
