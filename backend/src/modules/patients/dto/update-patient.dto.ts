import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?:|(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*)$/u, {
    message: 'Middle name must contain at least 3 letters and no numbers',
  })
  middleName?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsBoolean()
  birthDateEstimated?: boolean;

  @IsOptional()
  @IsString()
  sexAtBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  occupation?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, {
    message:
      'Phone number must contain 9 to 15 digits and may start with +',
  })
  phone?: string;


}