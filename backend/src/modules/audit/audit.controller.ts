import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuditService } from './audit.service.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@Controller('audit')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@RequirePermissions('audit.read')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(
    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,

    @Query('action')
    action?: string,

    @Query('eventType')
    eventType?: string,
  ) {
    return this.auditService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      action,
      eventType,
    });
  }

  @Get('patient/:patientId')
  findByPatient(
    @Param('patientId')
    patientId: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    return this.auditService.findByPatient(
      patientId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId')
    userId: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    return this.auditService.findByUser(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}