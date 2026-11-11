import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateClinicalNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  noteType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}