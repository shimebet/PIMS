import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtUser } from '../../common/types/jwt-user.type.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RetireUserDto } from './dto/retire-user.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('users')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class UsersController {
  constructor(
    private readonly usersService:
      UsersService,
  ) {}

  @Post()
  @RequirePermissions('user.create')
  create(
    @Body()
    dto: CreateUserDto,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.create(
      dto,
      actor.userId,
    );
  }

  @Get()
  @RequirePermissions('user.read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('user.read')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.usersService.findOne(
      id,
    );
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateUserDto,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.update(
      id,
      dto,
      actor.userId,
    );
  }

  @Post(':id/reset-password')
  @RequirePermissions('user.manage')
  resetPassword(
    @Param('id')
    id: string,

    @Body()
    dto: ResetPasswordDto,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.resetPassword(
      id,
      dto.newPassword,
      actor.userId,
    );
  }
  @Post(':id/lock')
  @RequirePermissions('user.manage')
  lock(
    @Param('id')
    id: string,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.lock(id, actor.userId);
  }

  @Post(':id/unlock')
  @RequirePermissions('user.manage')
  unlock(
    @Param('id')
    id: string,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.unlock(
      id,
      actor.userId,
    );
  }

  @Post(':id/retire')
  @RequirePermissions('user.manage')
  retire(
    @Param('id')
    id: string,

    @Body()
    dto: RetireUserDto,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.retire(
      id,
      dto.reason,
      dto.confirmation,
      actor.userId,
    );
  }

  @Post(':id/roles')
  @RequirePermissions('role.manage')
  assignRole(
    @Param('id')
    id: string,

    @Body()
    dto: AssignRoleDto,

    @CurrentUser()
    actor: JwtUser,
  ) {
    return this.usersService.assignRole(
      id,
      dto.roleCode,
      actor.userId,
      dto.mode,
    );
  }
}
