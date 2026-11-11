import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('admin-test')
export class AdminTestController {
  @Get()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions('user.manage')
  testAdminPermission() {
    return {
      success: true,
      message: 'You have user.manage permission',
    };
  }
}