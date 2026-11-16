import {
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({
  name: 'passwordsMatch',
  async: false,
})
class PasswordsMatchConstraint
  implements ValidatorConstraintInterface {
  validate(
    confirmation: unknown,
    args: ValidationArguments,
  ): boolean {
    const object = args.object as ChangePasswordDto;

    return (
      typeof confirmation === 'string' &&
      confirmation === object.newPassword
    );
  }

  defaultMessage(): string {
    return 'confirmPassword must match newPassword';
  }
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @Validate(PasswordsMatchConstraint)
  confirmPassword!: string;
}