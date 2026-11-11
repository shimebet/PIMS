import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import {
  MedicationsService,
} from './medications.service.js';

import {
  CreateMedicationOrderDto,
} from './dto/create-medication-order.dto.js';

import {
  CancelMedicationOrderDto,
} from './dto/cancel-medication-order.dto.js';

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
export class MedicationsController {
  constructor(
    private readonly medicationsService:
      MedicationsService,
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
    'encounters/:encounterId/medications',
  )
  @RequirePermissions(
    'medication.create',
  )
  create(
    @Param('encounterId')
    encounterId: string,

    @Body()
    dto: CreateMedicationOrderDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.medicationsService.create(
      encounterId,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(
    'encounters/:encounterId/medications',
  )
  @RequirePermissions(
    'medication.read',
  )
  findByEncounter(
    @Param('encounterId')
    encounterId: string,
  ) {
    return this.medicationsService.findByEncounter(
      encounterId,
    );
  }

  @Get(
    'patients/:patientId/medications',
  )
  @RequirePermissions(
    'medication.read',
  )
  findByPatient(
    @Param('patientId')
    patientId: string,
  ) {
    return this.medicationsService.findByPatient(
      patientId,
    );
  }

  @Get(
    'medications/:id',
  )
  @RequirePermissions(
    'medication.read',
  )
  findOne(
    @Param('id')
    id: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.medicationsService.findOne(
      id,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Patch(
    'medications/:id/cancel',
  )
  @RequirePermissions(
    'medication.update',
  )
  cancel(
    @Param('id')
    id: string,

    @Body()
    dto: CancelMedicationOrderDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.medicationsService.cancel(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }
}