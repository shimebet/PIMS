import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDiagnosisDto {
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeSystem?: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diagnosisType?: string;

  @IsOptional()
  @IsDateString()
  onsetAt?: string;
}