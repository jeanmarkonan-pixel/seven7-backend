import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Pas de trigger d'auto-génération sur rapport (contrairement à
// anomalie.reference) et pas de contrainte unique en base — reference
// reste un champ libre du client, pas d'invention d'une règle 409 sans
// contrainte réelle pour la porter (leçon tirée du module anomalies).
export class CreateRapportDto {
  @ApiProperty({
    example: 'rapport_audit',
    description: 'Code de ref_type_rapport : rapport_audit, rapport_limited, rapport_special, lettre_management, rapport_interne',
  })
  @IsString()
  typeRapportCode!: string;

  @ApiProperty({ example: 'RAP-2026-001' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  reference!: string;

  @ApiProperty({ example: 'Rapport d’audit des états financiers — exercice 2026' })
  @IsString()
  @MinLength(5)
  titre!: string;

  @ApiPropertyOptional({ description: 'Corps du rapport, rédigé progressivement jusqu’à signature' })
  @IsOptional()
  @IsString()
  contenu?: string;
}
