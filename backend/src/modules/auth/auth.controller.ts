import {
  Body,
  Patch,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from './auth.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

import { LoginDto } from './dto/login.dto.js';

import {
  RefreshTokenDto,
} from './dto/refresh-token.dto.js';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard.js';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';

import type {
  JwtUser,
} from '../../common/types/jwt-user.type.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:
      AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(
    @CurrentUser() user: JwtUser,
  ) {
    return this.authService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(
      user.userId,
      dto,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto,
    );
  }
  @Post('login')
  login(
    @Body()
    dto: LoginDto,

    @Req()
    request: Request,
  ) {
    return this.authService.login(
      dto.username,
      dto.password,
      request.ip,
      request.headers[
        'user-agent'
      ],
    );
  }

  @Post('refresh')
  refresh(
    @Body()
    dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser()
    user: JwtUser,
  ) {
    return this.authService.logout(
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @CurrentUser()
    user: JwtUser,
  ) {
    return user;
  }
}