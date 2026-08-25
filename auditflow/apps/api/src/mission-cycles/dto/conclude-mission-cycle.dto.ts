import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConcludeMissionCycleDto {
  @ApiProperty({ description: 'Conclusion motivée du cycle' })
  @IsString()
  @MinLength(10)
  conclusion!: string;
}
