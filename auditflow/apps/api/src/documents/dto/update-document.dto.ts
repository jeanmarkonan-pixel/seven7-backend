import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({
    example: 'valide',
    description: 'Code de ref_statut_document : en_attente, depose, en_revue, valide, rejete, a_completer',
  })
  @IsOptional()
  @IsString()
  statutCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numeroPiece?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  montant?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDocument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;
}
