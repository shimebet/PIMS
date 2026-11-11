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

import { ClinicalNotesService } from './clinical-notes.service.js';

import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto.js';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto.js';
import { SignClinicalNoteDto } from './dto/sign-clinical-note.dto.js';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';

import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import type {
  JwtUser,
} from '../../common/types/jwt-user.type.js';

@Controller()
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class ClinicalNotesController {
  constructor(
    private readonly clinicalNotesService:
      ClinicalNotesService,
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
    'encounters/:encounterId/notes',
  )
  @RequirePermissions(
    'note.create',
  )
  create(
    @Param('encounterId')
    encounterId: string,

    @Body()
    dto: CreateClinicalNoteDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.clinicalNotesService.create(
      encounterId,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get(
    'encounters/:encounterId/notes',
  )
  @RequirePermissions(
    'note.read',
  )
  findByEncounter(
    @Param('encounterId')
    encounterId: string,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.clinicalNotesService.findByEncounter(
      encounterId,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Get('notes/:id')
  @RequirePermissions(
    'note.read',
  )
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.clinicalNotesService.findOne(
      id,
    );
  }

  @Patch('notes/:id')
  @RequirePermissions(
    'note.update',
  )
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateClinicalNoteDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.clinicalNotesService.update(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }

  @Post('notes/:id/sign')
  @RequirePermissions(
    'note.update',
  )
  sign(
    @Param('id')
    id: string,

    @Body()
    dto: SignClinicalNoteDto,

    @Req()
    request: Request,

    @CurrentUser()
    user: JwtUser,
  ) {
    return this.clinicalNotesService.sign(
      id,
      dto,
      this.getContext(
        request,
        user,
      ),
    );
  }
}