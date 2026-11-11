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

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

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
  ) {
    return this.usersService.create(
      dto,
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
  ) {
    return this.usersService.update(
      id,
      dto,
    );
  }

  @Post(':id/lock')
  @RequirePermissions('user.manage')
  lock(
    @Param('id')
    id: string,
  ) {
    return this.usersService.lock(id);
  }

  @Post(':id/unlock')
  @RequirePermissions('user.manage')
  unlock(
    @Param('id')
    id: string,
  ) {
    return this.usersService.unlock(
      id,
    );
  }

  @Post(':id/roles')
  @RequirePermissions('role.manage')
  assignRole(
    @Param('id')
    id: string,

    @Body()
    dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(
      id,
      dto.roleCode,
    );
  }
}