import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRadiologyOrderDto {
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsString()
  @MaxLength(50)
  modality!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bodySite?: string;

  @IsString()
  @MaxLength(500)
  studyDescription!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalIndication?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priority?: string;
}