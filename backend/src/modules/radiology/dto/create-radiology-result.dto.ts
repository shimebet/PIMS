import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIn,
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
  @IsIn(['FINAL'])
  status?: 'FINAL';

  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}