import {
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CloseEncounterDto {
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}