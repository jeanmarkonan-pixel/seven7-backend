import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

import { CreateMissionDto } from './create-mission.dto';

export class UpdateMissionDto extends PartialType(CreateMissionDto) {
  @ApiPropertyOptional({
    example: 'sans_reserve',
    description: 'Code de ref_type_opinion, renseigné à la clôture de la mission',
  })
  @IsOptional()
  @IsString()
  typeOpinionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateSignatureRapport?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFinReelle?: string;
}
