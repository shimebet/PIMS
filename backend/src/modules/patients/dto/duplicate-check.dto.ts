import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class DuplicateCheckDto {
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  sexAtBirth?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}