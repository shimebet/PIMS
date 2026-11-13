import {
  Equals,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLabResultDto {
  @IsOptional()
  @IsNumber()
  valueNumeric?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  valueText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsNumber()
  referenceRangeLow?: number;

  @IsOptional()
  @IsNumber()
  referenceRangeHigh?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  abnormalFlag?: string;

  @IsOptional()
  @Equals('PRELIMINARY')
  status?: string;

  @IsOptional()
  @IsDateString()
  resultedAt?: string;
}