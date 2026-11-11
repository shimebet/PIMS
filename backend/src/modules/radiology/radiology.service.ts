import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateRadiologyOrderDto } from './dto/create-radiology-order.dto.js';
import { CreateRadiologyResultDto } from './dto/create-radiology-result.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class RadiologyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createOrder(
    encounterId: string,
    dto: CreateRadiologyOrderDto,
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

    if (encounter.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Radiology order cannot be created for a completed encounter',
      );
    }

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id: dto.practitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found',
        );
      }
    }

    const order =
      await this.prisma.$transaction(
        async (tx) => {
          const sequence =
            await tx.numberSequence.update({
              where: {
                sequenceKey:
                  'RADIOLOGY_ORDER_NUMBER',
              },

              data: {
                value: {
                  increment: 1,
                },
              },
            });

          const orderNumber =
            `RAD${sequence.value
              .toString()
              .padStart(8, '0')}`;

          return tx.radiologyOrder.create({
            data: {
              patientId:
                encounter.patientId,

              encounterId:
                encounter.id,

              practitionerId:
                dto.practitionerId,

              orderNumber,

              modality:
                dto.modality,

              bodySite:
                dto.bodySite,

              studyDescription:
                dto.studyDescription,

              clinicalIndication:
                dto.clinicalIndication,

              priority:
                dto.priority ?? 'ROUTINE',

              status:
                'ORDERED',

              orderedAt:
                new Date(),
            },

            include: {
              patient: {
                select: {
                  id: true,
                  patientNumber: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },

              practitioner:
                true,
            },
          });
        },
      );

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_CREATE',

      action:
        'RADIOLOGY_ORDER_CREATE',

      resourceType:
        'RadiologyOrder',

      resourceId:
        order.id,

      patientId:
        order.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      newValues: {
        orderNumber:
          order.orderNumber,

        modality:
          order.modality,

        studyDescription:
          order.studyDescription,
      },
    });

    return order;
  }

  async findOne(
    id: string,
    context?: RequestContext,
  ) {
    const order =
      await this.prisma.radiologyOrder.findUnique({
        where: {
          id,
        },

        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },

          encounter: {
            select: {
              id: true,
              encounterNumber: true,
              encounterType: true,
              startedAt: true,
            },
          },

          practitioner:
            true,

          result: {
            include: {
              reportedByPractitioner:
                true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Radiology order not found',
      );
    }

    if (context) {
      await this.auditService.log({
        userId:
          context.userId,

        eventType:
          'DATA_READ',

        action:
          'RADIOLOGY_ORDER_READ',

        resourceType:
          'RadiologyOrder',

        resourceId:
          order.id,

        patientId:
          order.patientId,

        ipAddress:
          context.ipAddress,

        userAgent:
          context.userAgent,

        requestId:
          context.requestId,
      });
    }

    return order;
  }

  async findByPatient(
    patientId: string,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: patientId,
        },

        select: {
          id: true,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found',
      );
    }

    return this.prisma.radiologyOrder.findMany({
      where: {
        patientId,
      },

      include: {
        result:
          true,

        practitioner:
          true,

        encounter: {
          select: {
            id: true,
            encounterNumber: true,
            encounterType: true,
            startedAt: true,
          },
        },
      },

      orderBy: {
        orderedAt:
          'desc',
      },
    });
  }

  async createResult(
    orderId: string,
    dto: CreateRadiologyResultDto,
    context: RequestContext,
  ) {
    const order =
      await this.prisma.radiologyOrder.findUnique({
        where: {
          id: orderId,
        },

        include: {
          result:
            true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Radiology order not found',
      );
    }

    if (order.result) {
      throw new BadRequestException(
        'A radiology result already exists for this order',
      );
    }

    if (
      !dto.findings &&
      !dto.impression
    ) {
      throw new BadRequestException(
        'Findings or impression is required',
      );
    }

    if (
      dto.reportedByPractitionerId
    ) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: {
            id:
              dto.reportedByPractitionerId,
          },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Reporting practitioner not found',
        );
      }
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const created =
            await tx.radiologyResult.create({
              data: {
                radiologyOrderId:
                  order.id,

                findings:
                  dto.findings,

                impression:
                  dto.impression,

                status:
                  dto.status ??
                  'FINAL',

                reportedByPractitionerId:
                  dto.reportedByPractitionerId,

                reportedAt:
                  dto.reportedAt
                    ? new Date(
                        dto.reportedAt,
                      )
                    : new Date(),
              },
            });

          await tx.radiologyOrder.update({
            where: {
              id:
                order.id,
            },

            data: {
              status:
                'COMPLETED',
            },
          });

          return created;
        },
      );

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_CREATE',

      action:
        'RADIOLOGY_RESULT_CREATE',

      resourceType:
        'RadiologyResult',

      resourceId:
        result.id,

      patientId:
        order.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,
    });

    return result;
  }
}