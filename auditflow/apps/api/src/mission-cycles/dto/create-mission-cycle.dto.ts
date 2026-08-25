import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateMissionCycleDto {
  @ApiProperty({
    example: 'cash',
    description: 'Code de ref_cycle_isa : cash, immobilisations, stocks, tiers, emprunts, capitaux, charges, produits, engagements',
  })
  @IsString()
  cycleCode!: string;

  @ApiPropertyOptional({ description: 'Utilisateur du cabinet responsable du cycle' })
  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  materialite?: number;

  // Le schéma ne définit aucune table de référence pour ces champs
  // (VARCHAR libres) — aucune valeur fermée n'est imposée ici non plus,
  // plutôt que d'inventer une taxonomie que le schéma ne prévoit pas.
  @ApiPropertyOptional({ example: 'moyen' })
  @IsOptional()
  @IsString()
  risqueInherent?: string;

  @ApiPropertyOptional({ example: 'faible' })
  @IsOptional()
  @IsString()
  risqueControle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  risqueDetection?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  risqueGlobal?: string;

  @ApiPropertyOptional({ example: 'mixte' })
  @IsOptional()
  @IsString()
  approche?: string;
}
