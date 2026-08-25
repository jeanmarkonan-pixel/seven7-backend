import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'nouveau.senior@cabinet.ci' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'un-mot-de-passe-suffisamment-long' })
  @IsString()
  @MinLength(12) // politique NIST 800-63B, plan de conformité §5.4
  password!: string;

  @ApiProperty({ example: 'Diallo' })
  @IsString()
  nom!: string;

  @ApiProperty({ example: 'Mariam' })
  @IsString()
  prenom!: string;

  @ApiProperty({
    example: 'senior',
    description: 'Code de ref_role_utilisateur : super_admin, admin_cabinet, associe, manager, senior, junior, client',
  })
  @IsString()
  roleCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fonction?: string;

  @ApiPropertyOptional({
    description:
      "Réservé à super_admin : crée l'utilisateur dans ce cabinet plutôt que le sien. " +
      'Ignoré pour tout autre rôle, qui ne peut créer que dans son propre cabinet.',
  })
  @IsOptional()
  @IsUUID()
  cabinetId?: string;
}
