import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEncounterDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  facilityId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsString()
  @MaxLength(50)
  encounterType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonForVisit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}