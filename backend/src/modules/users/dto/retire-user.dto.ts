import {
  Equals,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RetireUserDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;

  @IsString()
  @Equals('DELETE')
  confirmation!: string;
}