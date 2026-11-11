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

import type {
  Request,
} from 'express';

import { EncountersService } from './encounters.service.js';

import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { CloseEncounterDto } from './dto/close-encounter.dto.js';
import { CreateVitalsDto } from './dto/create-vitals.dto.js';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto.js';
import { QueryEncountersDto } from './dto/query-encounters.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type {
  JwtUser,
} from '../../common/types/jwt-user.type.js';

@Controller('encounters')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class EncountersController {
  constructor(
    private readonly encountersService:
      EncountersService,
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

  @Post()
  @RequirePermissions(
    'encounter.create',
  )
  create(
    @Body()
    dto: CreateEncounterDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.encountersService.create(
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get()
  @RequirePermissions('encounter.read')
  findAll(
    @Query() query: QueryEncountersDto,
  ) {
    return this.encountersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(
    'encounter.read',
  )
  findOne(
    @Param('id')
    id: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.encountersService.findOne(
      id,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Patch(':id/close')
  @RequirePermissions(
    'encounter.update',
  )
  close(
    @Param('id')
    id: string,

    @Body()
    dto: CloseEncounterDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.encountersService.close(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Post(':id/vitals')
  @RequirePermissions(
    'vitals.create',
  )
  createVitals(
    @Param('id')
    id: string,

    @Body()
    dto: CreateVitalsDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.encountersService.createVitals(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(':id/vitals')
  @RequirePermissions(
    'vitals.read',
  )
  findVitals(
    @Param('id')
    id: string,
  ) {
    return this.encountersService.findVitals(
      id,
    );
  }

  @Post(':id/diagnoses')
  @RequirePermissions(
    'diagnosis.create',
  )
  createDiagnosis(
    @Param('id')
    id: string,

    @Body()
    dto: CreateDiagnosisDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.encountersService.createDiagnosis(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(':id/diagnoses')
  @RequirePermissions(
    'diagnosis.read',
  )
  findDiagnoses(
    @Param('id')
    id: string,
  ) {
    return this.encountersService.findDiagnoses(
      id,
    );
  }
}