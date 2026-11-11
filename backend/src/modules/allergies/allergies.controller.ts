import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import { AllergiesService } from './allergies.service.js';
import { CreateAllergyDto } from './dto/create-allergy.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type {
  JwtUser,
} from '../../common/types/jwt-user.type.js';

@Controller('patients/:patientId/allergies')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class AllergiesController {
  constructor(
    private readonly allergiesService:
      AllergiesService,
  ) {}

  @Post()
  @RequirePermissions(
    'allergy.create',
  )
  create(
    @Param('patientId')
    patientId: string,

    @Body()
    dto: CreateAllergyDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.allergiesService.create(
      patientId,
      dto,
      {
        userId:
          user.userId,

        ipAddress:
          request.ip,

        userAgent:
          request.headers[
            'user-agent'
          ],

        requestId:
          typeof request.headers[
            'x-request-id'
          ] === 'string'
            ? request.headers[
                'x-request-id'
              ]
            : undefined,
      },
    );
  }

  @Get()
  @RequirePermissions(
    'allergy.read',
  )
  findAll(
    @Param('patientId')
    patientId: string,
  ) {
    return this.allergiesService.findByPatient(
      patientId,
    );
  }
}