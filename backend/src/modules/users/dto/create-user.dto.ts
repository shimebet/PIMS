import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
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
  @MaxLength(100)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}