import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateClinicalNoteDto {
  @IsString()
  @MaxLength(50)
  noteType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsUUID()
  authorPractitionerId?: string;
}