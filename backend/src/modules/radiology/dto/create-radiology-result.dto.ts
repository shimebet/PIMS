import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRadiologyResultDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  findings?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  impression?: string;

  @IsOptional()
  @IsUUID()
  reportedByPractitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}