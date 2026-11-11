import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateAllergyDto } from './dto/create-allergy.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class AllergiesService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly auditService:
      AuditService,
  ) {}

  async create(
    patientId: string,
    dto: CreateAllergyDto,
    context: RequestContext,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: patientId,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found',
      );
    }

    const allergy =
      await this.prisma.allergy.create({
        data: {
          patientId,

          substance:
            dto.substance,

          allergyType:
            dto.allergyType,

          criticality:
            dto.criticality,

          reaction:
            dto.reaction,

          severity:
            dto.severity,

          onsetAt:
            dto.onsetAt
              ? new Date(dto.onsetAt)
              : null,

          notes:
            dto.notes,

          clinicalStatus:
            'ACTIVE',
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_CREATE',

      action:
        'ALLERGY_CREATE',

      resourceType:
        'Allergy',

      resourceId:
        allergy.id,

      patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,
    });

    return allergy;
  }

  async findByPatient(
    patientId: string,
  ) {
    return this.prisma.allergy.findMany({
      where: {
        patientId,
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });
  }
}