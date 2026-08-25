import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RecordExecutionDto {
  @ApiProperty({
    example: 'conforme',
    description: 'Code de ref_statut_test : non_commence, en_cours, conforme, ecart, na, a_creuser',
  })
  @IsString()
  statutCode!: string;

  @ApiPropertyOptional({ description: 'Constat détaillé de l’exécution du test' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  resultat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({ description: 'Nombre d’exceptions relevées dans l’échantillon' })
  @IsOptional()
  @IsInt()
  @Min(0)
  echantillonDefaut?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conclusion?: string;
}
