import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?:|(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*)$/u, {
    message: 'Middle name must contain at least 3 letters and no numbers',
  })
  middleName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  lastName?: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}