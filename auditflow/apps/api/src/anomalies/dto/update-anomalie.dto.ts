import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { CreateAnomalieDto } from './create-anomalie.dto';

export class UpdateAnomalieDto extends PartialType(CreateAnomalieDto) {
  @ApiPropertyOptional({
    example: 'en_discussion',
    description: 'Code de ref_statut_anomalie : ouverte, en_discussion, ajustement_propose, ajustement_accepte, close, rejetee',
  })
  @IsOptional()
  @IsString()
  statutCode?: string;

  @ApiPropertyOptional({ description: 'Commentaire motivant le changement de statut, consigné dans anomalie_historique' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: 'Renseigné quand statutCode="close"' })
  @IsOptional()
  @IsString()
  conclusion?: string;
}
