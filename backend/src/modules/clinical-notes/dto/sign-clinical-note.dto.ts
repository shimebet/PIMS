import {
  IsDateString,
  IsOptional,
} from 'class-validator';

export class SignClinicalNoteDto {
  @IsOptional()
  @IsDateString()
  signedAt?: string;
}