import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'SOTRACI SA' })
  @IsString()
  raisonSociale!: string;

  @ApiPropertyOptional({ example: 'SA' })
  @IsOptional()
  @IsString()
  formeJuridique?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rccm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secteurActivite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Nom du contact référent chez le client' })
  @IsOptional()
  @IsString()
  contactNom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
