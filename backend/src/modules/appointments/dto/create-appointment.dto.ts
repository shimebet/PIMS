import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  facilityId!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appointmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  scheduledStart!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  scheduledEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
