import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignRapportDto {
  @ApiProperty({
    example: 'sans_reserve',
    description: 'Code de ref_type_opinion : sans_reserve, avec_reserve, defavorable, abstention, sans_reserve_emphasis',
  })
  @IsString()
  typeOpinionCode!: string;
}
