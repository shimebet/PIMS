
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export enum HealthReportPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

export class HealthReportQueryDto {
  /* ==========================================
     REPORTING PERIOD
  ========================================== */

  @IsEnum(HealthReportPeriod)
  period: HealthReportPeriod = HealthReportPeriod.MONTHLY;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number = 2026;

  // Specific date for DAILY reports.
  @IsOptional()
  @IsDateString()
  date?: string;

  // Month: 1-12.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  // Day of month: 1-31.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;

  // ISO week: 1-53.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week?: number;

  // Quarter: 1-4.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;

  // Half-year: 1-2.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  halfYear?: number;

  /* ==========================================
     OPTIONAL REPORT DISPLAY INFORMATION

     These fields are descriptive overrides
     for this report only.

     They must never be used to select the
     facility whose clinical data is queried.
  ========================================== */

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reportFacilityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reportRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reportCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  reportAddress?: string;
}
