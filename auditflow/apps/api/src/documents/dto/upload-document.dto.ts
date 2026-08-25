import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    example: 'facture',
    description:
      'Code de ref_type_document : balance, releve_bancaire, facture, pv_inventaire, contrat, ' +
      'etat_financier, circularisation, note_calcul, justificatif, rapport',
  })
  @IsString()
  typeDocumentCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  missionCycleId?: string;

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
}
