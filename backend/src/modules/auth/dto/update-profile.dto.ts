import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const NAME_PATTERN = /^[A-Za-z]{3,100}$/;
const ETHIOPIAN_MOBILE_PATTERN = /^(?:0[97]|\+251[97])[0-9]{8}$/;

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(NAME_PATTERN, {
    message: 'firstName must contain 3-100 English letters (A-Z) only',
  })
  firstName?: string;

  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsString()
  @Matches(NAME_PATTERN, {
    message: 'middleName must contain 3-100 English letters (A-Z) only',
  })
  middleName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(NAME_PATTERN, {
    message: 'lastName must contain 3-100 English letters (A-Z) only',
  })
  lastName?: string;

  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsString()
  @Matches(ETHIOPIAN_MOBILE_PATTERN, {
    message: 'phone must be a valid Ethiopian mobile number',
  })
  phone?: string;
}