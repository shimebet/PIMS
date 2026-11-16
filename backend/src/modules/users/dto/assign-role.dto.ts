import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum RoleAssignmentMode {
  REPLACE = 'REPLACE',
  ADD = 'ADD',
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleCode!: string;

  @IsOptional()
  @IsEnum(RoleAssignmentMode)
  mode: RoleAssignmentMode = RoleAssignmentMode.REPLACE;
}