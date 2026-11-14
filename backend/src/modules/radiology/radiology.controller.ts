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

import {
  RadiologyService,
} from './radiology.service.js';

import {
  CreateRadiologyOrderDto,
} from './dto/create-radiology-order.dto.js';

import {
  CreateRadiologyResultDto,
} from './dto/create-radiology-result.dto.js';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard.js';

import {
  PermissionsGuard,
} from '../../common/guards/permissions.guard.js';

import {
  RequirePermissions,
} from '../../common/decorators/permissions.decorator.js';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator.js';

import type {
  JwtUser,
} from '../../common/types/jwt-user.type.js';

@Controller()
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class RadiologyController {
  constructor(
    private readonly radiologyService:
      RadiologyService,
  ) {}

  private getContext(
    request: Request,
    user: JwtUser,
  ) {
    return {
      userId:
        user.userId,

      facilityId:
        user.facilityId,

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
    };
  }

  @Post(
    'encounters/:encounterId/radiology-orders',
  )
  @RequirePermissions(
    'radiology.order',
  )
  createOrder(
    @Param('encounterId')
    encounterId: string,

    @Body()
    dto: CreateRadiologyOrderDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.radiologyService.createOrder(
      encounterId,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(
    'radiology-orders/:id',
  )
  @RequirePermissions(
    'radiology.read',
  )
  findOne(
    @Param('id')
    id: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.radiologyService.findOne(
      id,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(
    'patients/:patientId/radiology-orders',
  )
  @RequirePermissions(
    'radiology.read',
  )
  findByPatient(
    @Param('patientId')
    patientId: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.radiologyService.findByPatient(
      patientId,
      this.getContext(request, user),
    );
  }

  @Post(
    'radiology-orders/:id/result',
  )
  @RequirePermissions(
    'radiology.result',
  )
  createResult(
    @Param('id')
    id: string,

    @Body()
    dto: CreateRadiologyResultDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.radiologyService.createResult(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }
}