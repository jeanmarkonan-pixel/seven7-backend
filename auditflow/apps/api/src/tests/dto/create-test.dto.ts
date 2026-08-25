import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateTestDto {
  @ApiPropertyOptional({
    description:
      "Test du catalogue programme_travail à reprendre — préremplit objectif/procedure/assertions. " +
      'Omis : le test est créé libre, avec objectif/procedure/typeTestCode fournis explicitement.',
  })
  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @ApiProperty({ example: 'TC-CASH-01' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  reference!: string;

  // Si programmeId est fourni, typeTestCode/objectif/procedure viennent du
  // catalogue et ces champs sont ignorés côté service — mais ValidateIf les
  // rend obligatoires quand programmeId est absent, pour qu'un test "libre"
  // ne puisse pas être créé à moitié rempli.
  @ApiPropertyOptional({
    example: 'test_controle',
    description: 'Requis si programmeId est omis. Code de ref_type_test.',
  })
  @ValidateIf((dto: CreateTestDto) => !dto.programmeId)
  @IsString()
  typeTestCode?: string;

  @ApiPropertyOptional({ description: 'Requis si programmeId est omis.' })
  @ValidateIf((dto: CreateTestDto) => !dto.programmeId)
  @IsString()
  @MinLength(5)
  objectif?: string;

  @ApiPropertyOptional({ description: 'Requis si programmeId est omis.' })
  @ValidateIf((dto: CreateTestDto) => !dto.programmeId)
  @IsString()
  @MinLength(5)
  procedure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  echantillonTaille?: number;
}
