import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type { JwtUser } from '../../common/types/jwt-user.type.js';
import type { RequestContext } from '../../common/types/request-context.type.js';

import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { QueryAppointmentsDto } from './dto/query-appointments.dto.js';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto.js';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto.js';

@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private getContext(
    request: Request,
    user: JwtUser,
  ): RequestContext {
    return {
      userId: user.userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestId:
        typeof request.headers['x-request-id'] === 'string'
          ? request.headers['x-request-id']
          : undefined,
    };
  }

  @Post()
  @RequirePermissions('appointment.create')
  create(
    @Body() dto: CreateAppointmentDto,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.create(
      dto,
      this.getContext(request, user),
    );
  }

  @Get()
  @RequirePermissions('appointment.read')
  findAll(
    @Query() query: QueryAppointmentsDto,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.findAll(
      query,
      this.getContext(request, user),
      user.permissions,
    );
  }

  @Get(':id')
  @RequirePermissions('appointment.read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.findOne(
      id,
      this.getContext(request, user),
    );
  }

  @Patch(':id/status')
  @RequirePermissions('appointment.update')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      dto,
      this.getContext(request, user),
    );
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointment.update')
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() request: Request,
    @CurrentUser() user: JwtUser,
  ) {
    return this.appointmentsService.reschedule(
      id,
      dto.scheduledStart,
      dto.scheduledEnd,
      this.getContext(request, user),
    );
  }
}
