import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from './auth.service.js';

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