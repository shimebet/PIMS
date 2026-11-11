import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CancelMedicationOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}