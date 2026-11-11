import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { PatientsService } from './patients.service.js';

import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { DuplicateCheckDto } from './dto/duplicate-check.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type { JwtUser } from '../../common/types/jwt-user.type.js';

@Controller('patients')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  private getRequestContext(
    request: Request,
    user: JwtUser,
  ) {
    return {
      userId: user.userId,

      ipAddress: request.ip,

      userAgent:
        request.headers['user-agent'],

      requestId:
        typeof request.headers['x-request-id'] === 'string'
          ? request.headers['x-request-id']
          : undefined,
    };
  }

  @Post()
  @RequirePermissions('patient.create')
  create(
    @Body()
    dto: CreatePatientDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.patientsService.create(
      dto,
      this.getRequestContext(
        request,
        user,
      ),
    );
  }

  @Get()
  @RequirePermissions('patient.read')
  findAll(
    @Query('search')
    search?: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    return this.patientsService.findAll(
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('duplicate-check')
  @RequirePermissions('patient.read')
  duplicateCheck(
    @Body()
    dto: DuplicateCheckDto,
  ) {
    return this.patientsService.checkDuplicate(dto);
  }

  @Get(':id')
  @RequirePermissions('patient.read')
  findOne(
    @Param('id')
    id: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.patientsService.findOne(
      id,
      this.getRequestContext(
        request,
        user,
      ),
    );
  }

  @Patch(':id')
  @RequirePermissions('patient.update')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePatientDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.patientsService.update(
      id,
      dto,
      this.getRequestContext(
        request,
        user,
      ),
    );
  }
}