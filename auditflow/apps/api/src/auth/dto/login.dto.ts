import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'senior@cabinet-konan.ci' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'un-mot-de-passe-suffisamment-long' })
  @IsString()
  @MinLength(12) // aligné sur la politique NIST 800-63B du plan de conformité (§5.4)
  password!: string;
}
