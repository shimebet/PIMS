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
  LaboratoryService,
} from './laboratory.service.js';

import {
  CreateLabOrderDto,
} from './dto/create-lab-order.dto.js';

import {
  CreateLabResultDto,
} from './dto/create-lab-result.dto.js';

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
export class LaboratoryController {
  constructor(
    private readonly laboratoryService:
      LaboratoryService,
  ) {}

  private getContext(
    request: Request,
    user: JwtUser,
  ) {
    return {
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
    };
  }

  @Post(
    'encounters/:encounterId/lab-orders',
  )
  @RequirePermissions(
    'lab.order',
  )
  createOrder(
    @Param('encounterId')
    encounterId: string,

    @Body()
    dto: CreateLabOrderDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.laboratoryService.createOrder(
      encounterId,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get('lab-orders/:id')
  @RequirePermissions(
    'lab.read',
  )
  findOne(
    @Param('id')
    id: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.laboratoryService.findOne(
      id,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(
    'patients/:patientId/lab-orders',
  )
  @RequirePermissions(
    'lab.read',
  )
  findByPatient(
    @Param('patientId')
    patientId: string,
  ) {
    return this.laboratoryService.findByPatient(
      patientId,
    );
  }

  @Post(
    'lab-orders/:orderId/items/:itemId/result',
  )
  @RequirePermissions(
    'lab.result',
  )
  createResult(
    @Param('orderId')
    orderId: string,

    @Param('itemId')
    itemId: string,

    @Body()
    dto: CreateLabResultDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.laboratoryService.createResult(
      orderId,
      itemId,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }
}