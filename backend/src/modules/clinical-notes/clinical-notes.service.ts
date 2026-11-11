import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto.js';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto.js';
import { SignClinicalNoteDto } from './dto/sign-clinical-note.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class ClinicalNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    encounterId: string,
    dto: CreateClinicalNoteDto,
    context: RequestContext,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id: encounterId,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found',
      );
    }

    if (
      encounter.status !==
      'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        'Clinical notes cannot be added to a completed encounter',
      );
    }

    if (dto.authorPractitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.authorPractitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found',
        );
      }
    }

    const note =
      await this.prisma.clinicalNote.create({
        data: {
          patientId:
            encounter.patientId,

          encounterId:
            encounter.id,

          authorUserId:
            context.userId,

          authorPractitionerId:
            dto.authorPractitionerId,

          noteType:
            dto.noteType,

          title:
            dto.title,

          content:
            dto.content,

          status:
            'DRAFT',
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_CREATE',

      action:
        'CLINICAL_NOTE_CREATE',

      resourceType:
        'ClinicalNote',

      resourceId:
        note.id,

      patientId:
        encounter.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      success:
        true,
    });

    return note;
  }

  async findByEncounter(
    encounterId: string,
    context?: RequestContext,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id: encounterId,
        },

        select: {
          id: true,
          patientId: true,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found',
      );
    }

    const notes =
      await this.prisma.clinicalNote.findMany({
        where: {
          encounterId,
        },

        include: {
          authorUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },

          authorPractitioner:
            true,
        },

        orderBy: {
          createdAt:
            'desc',
        },
      });

    if (context) {
      await this.auditService.log({
        userId:
          context.userId,

        eventType:
          'DATA_READ',

        action:
          'CLINICAL_NOTE_READ',

        resourceType:
          'Encounter',

        resourceId:
          encounterId,

        patientId:
          encounter.patientId,

        ipAddress:
          context.ipAddress,

        userAgent:
          context.userAgent,

        requestId:
          context.requestId,
      });
    }

    return notes;
  }

  async findOne(
    id: string,
  ) {
    const note =
      await this.prisma.clinicalNote.findUnique({
        where: {
          id,
        },

        include: {
          encounter: true,

          authorUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },

          authorPractitioner:
            true,
        },
      });

    if (!note) {
      throw new NotFoundException(
        'Clinical note not found',
      );
    }

    return note;
  }

  async update(
    id: string,
    dto: UpdateClinicalNoteDto,
    context: RequestContext,
  ) {
    const note =
      await this.findOne(id);

    if (
      note.status === 'SIGNED'
    ) {
      throw new BadRequestException(
        'Signed clinical notes cannot be edited',
      );
    }

    const updated =
      await this.prisma.clinicalNote.update({
        where: {
          id,
        },

        data: {
          noteType:
            dto.noteType,

          title:
            dto.title,

          content:
            dto.content,
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_UPDATE',

      action:
        'CLINICAL_NOTE_UPDATE',

      resourceType:
        'ClinicalNote',

      resourceId:
        id,

      patientId:
        note.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      newValues: {
        changedFields:
          Object.keys(dto),
      },
    });

    return updated;
  }

  async sign(
    id: string,
    dto: SignClinicalNoteDto,
    context: RequestContext,
  ) {
    const note =
      await this.findOne(id);

    if (
      note.status === 'SIGNED'
    ) {
      throw new BadRequestException(
        'Clinical note is already signed',
      );
    }

    const signed =
      await this.prisma.clinicalNote.update({
        where: {
          id,
        },

        data: {
          status:
            'SIGNED',

          signedAt:
            dto.signedAt
              ? new Date(dto.signedAt)
              : new Date(),
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_UPDATE',

      action:
        'CLINICAL_NOTE_SIGN',

      resourceType:
        'ClinicalNote',

      resourceId:
        id,

      patientId:
        note.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,
    });

    return signed;
  }
}