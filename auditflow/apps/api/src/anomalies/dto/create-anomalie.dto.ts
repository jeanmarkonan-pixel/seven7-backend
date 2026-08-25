import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Pas de champ "reference" ici : le trigger SQL trg_anomalie_reference
// (BEFORE INSERT ON anomalie) génère systématiquement la référence
// ("A-2026-001"...) et écrase toute valeur envoyée par le client — le
// vérifier soi-même avant de l'exposer dans une API évite de faire croire
// à l'appelant qu'il la choisit.
export class CreateAnomalieDto {
  @ApiPropertyOptional({ description: 'Cycle ISA concerné, s’il y a lieu' })
  @IsOptional()
  @IsUUID()
  missionCycleId?: string;

  @ApiPropertyOptional({ description: 'Test ayant révélé l’anomalie, s’il y a lieu' })
  @IsOptional()
  @IsUUID()
  testExecutionId?: string;

  @ApiProperty({ example: 'Absence de rapprochement bancaire sur 3 mois' })
  @IsString()
  @MinLength(5)
  titre!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ example: 'E/O,C', description: 'Code(s) ref_assertion concerné(s)' })
  @IsOptional()
  @IsString()
  assertionConcernee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  montantImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pourcentageImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  impactSignificatif?: boolean;

  @ApiPropertyOptional({ description: 'Utilisateur du cabinet assigné au traitement de l’anomalie' })
  @IsOptional()
  @IsUUID()
  assigneeA?: string;
}
