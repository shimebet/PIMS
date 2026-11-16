import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
  MinLength,
} from 'class-validator';

import { Type } from 'class-transformer';

class PatientIdentifierDto {
  @IsString()
  identifierType!: string;

  @IsString()
  identifierValue!: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class PatientContactDto {
  @IsString()
  contactType!: string;

  @IsString()
  contactValue!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class PatientAddressDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  subCity?: string;

  @IsOptional()
  @IsString()
  kebele?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  houseNumber?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreatePatientDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?:|(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*)$/u, {
    message: 'Middle name must contain at least 3 letters and no numbers',
  })
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  lastName!: string;

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

  @IsUUID()
  registrationFacilityId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientIdentifierDto)
  identifiers?: PatientIdentifierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientContactDto)
  contacts?: PatientContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAddressDto)
  addresses?: PatientAddressDto[];
}