import {
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateVitalsDto {
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  systolicBloodPressure?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  diastolicBloodPressure?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  pulseRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(45)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  height?: number;
}