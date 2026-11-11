import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class CreateLabOrderItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  testCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeSystem?: string;

  @IsString()
  @MaxLength(255)
  testName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specimenType?: string;
}

export class CreateLabOrderDto {
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalInfo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabOrderItemDto)
  items!: CreateLabOrderItemDto[];
}