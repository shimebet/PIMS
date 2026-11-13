import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString({ strict: true })
  @IsNotEmpty()
  scheduledStart!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  scheduledEnd?: string;
}
