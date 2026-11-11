import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  @MaxLength(255)
  substance!: string;

  @IsOptional()
  @IsString()
  allergyType?: string;

  @IsOptional()
  @IsString()
  criticality?: string;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsDateString()
  onsetAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}