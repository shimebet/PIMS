
import { Type } from 'class-transformer';

import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryEncountersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsIn([
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'PLANNED',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  encounterType?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
