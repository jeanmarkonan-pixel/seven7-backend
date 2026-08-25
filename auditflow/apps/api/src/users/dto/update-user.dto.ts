import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

// cabinetId exclu : un utilisateur ne change pas de cabinet via ce endpoint.
class UpdatableFields extends OmitType(CreateUserDto, ['cabinetId'] as const) {}

export class UpdateUserDto extends PartialType(UpdatableFields) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(12)
  override password?: string;

  @ApiPropertyOptional({ description: 'Active ou désactive le compte — révoque immédiatement ses jetons émis' })
  @IsOptional()
  @IsBoolean()
  estActif?: boolean;
}
