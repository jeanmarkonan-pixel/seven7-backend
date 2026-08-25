import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { CreateMissionCycleDto } from './create-mission-cycle.dto';

export class UpdateMissionCycleDto extends PartialType(CreateMissionCycleDto) {
  @ApiPropertyOptional({ example: 'en_cours' })
  @IsOptional()
  @IsString()
  statut?: string;
}
