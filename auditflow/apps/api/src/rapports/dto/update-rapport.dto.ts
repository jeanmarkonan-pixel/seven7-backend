import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { CreateRapportDto } from './create-rapport.dto';

export class UpdateRapportDto extends PartialType(CreateRapportDto) {
  @ApiPropertyOptional({ example: 'en_revue', description: 'Statut libre — brouillon par défaut, aucune table de référence ne le contraint' })
  @IsOptional()
  @IsString()
  statut?: string;
}
