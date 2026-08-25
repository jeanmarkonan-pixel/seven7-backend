import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateRevueDto {
  @ApiProperty({
    example: 'manager',
    description: 'Niveau de revue — champ libre du schéma (aucune table de référence ne le contraint)',
  })
  @IsString()
  @MinLength(2)
  niveau!: string;

  @ApiPropertyOptional({
    description:
      "Relecteur assigné — par défaut l'appelant lui-même. Seuls admin_cabinet et super_admin " +
      'peuvent assigner la revue à quelqu’un d’autre (sinon usurpation d’identité du relecteur).',
  })
  @IsOptional()
  @IsUUID()
  relecteurId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaires?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pointsAttention?: string[];
}
