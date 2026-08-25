import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CabinetsService } from './cabinets.service';

@ApiTags('cabinets')
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinets: CabinetsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les cabinets inscrits' })
  findAll() {
    return this.cabinets.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un cabinet' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const cabinet = await this.cabinets.findOne(id);
    if (!cabinet) {
      throw new NotFoundException(`Cabinet ${id} introuvable`);
    }
    return cabinet;
  }
}
