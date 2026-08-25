import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMissionDto {
  @ApiProperty({ description: 'Client audité — doit appartenir au même cabinet' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({
    example: 'audit_annuel',
    description: 'Code de ref_type_mission : audit_annuel, audit_consolide, audit_limited, due_diligence, review',
  })
  @IsString()
  typeMissionCode!: string;

  @ApiPropertyOptional({
    example: 'prospect',
    description: 'Code de ref_statut_mission — par défaut "prospect" si omis',
  })
  @IsOptional()
  @IsString()
  statutCode?: string;

  @ApiProperty({ example: 'MIS-2026-001', description: 'Référence unique dans le cabinet' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  reference!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  exerciceDebut!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  exerciceFin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebutMission?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFinPrevue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  montantHonoraires?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  devise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectif?: string;

  @ApiPropertyOptional({ description: 'Utilisateur de rôle associe (ou supérieur) responsable de la mission' })
  @IsOptional()
  @IsUUID()
  associeId?: string;

  @ApiPropertyOptional({ description: 'Utilisateur de rôle manager (ou supérieur)' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Utilisateur de rôle senior (ou supérieur)' })
  @IsOptional()
  @IsUUID()
  seniorId?: string;

  @ApiPropertyOptional({ description: 'Utilisateur de rôle junior (ou supérieur)' })
  @IsOptional()
  @IsUUID()
  juniorId?: string;
}
