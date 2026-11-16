import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?:|(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*)$/u, {
    message: 'Middle name must contain at least 3 letters and no numbers',
  })
  middleName?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^(?=(?:[^\p{L}]*\p{L}){3})[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
    message: 'Name must contain at least 3 letters and no numbers',
  })
  lastName!: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}