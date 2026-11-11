import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMedicationOrderDto {
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medicationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeSystem?: string;

  @IsString()
  @MaxLength(255)
  medicationName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  strength?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dose?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  doseUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}