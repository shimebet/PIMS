import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
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
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @MaxLength(100)
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