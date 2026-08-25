import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateRevueDto {
  @ApiPropertyOptional({ example: 'termine', description: 'Statut libre : en_attente, en_cours, termine...' })
  @IsOptional()
  @IsString()
  statut?: string;

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
