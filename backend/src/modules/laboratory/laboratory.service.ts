import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateLabOrderDto } from './dto/create-lab-order.dto.js';
import { CreateLabResultDto } from './dto/create-lab-result.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class LaboratoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createOrder(
    encounterId: string,
    dto: CreateLabOrderDto,
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
        'Lab order cannot be created for a completed encounter',
      );
    }

    if (
      !dto.items ||
      dto.items.length === 0
    ) {
      throw new BadRequestException(
        'At least one laboratory test is required',
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

    const labOrder =
      await this.prisma.$transaction(
        async (tx) => {
          const sequence =
            await tx.numberSequence.update({
              where: {
                sequenceKey:
                  'LAB_ORDER_NUMBER',
              },

              data: {
                value: {
                  increment: 1,
                },
              },
            });

          const orderNumber =
            `LAB${sequence.value
              .toString()
              .padStart(8, '0')}`;

          return tx.labOrder.create({
            data: {
              patientId:
                encounter.patientId,

              encounterId:
                encounter.id,

              practitionerId:
                dto.practitionerId,

              orderNumber,

              priority:
                dto.priority ?? 'ROUTINE',

              clinicalInfo:
                dto.clinicalInfo,

              status:
                'ORDERED',

              orderedAt:
                new Date(),

              items: {
                create:
                  dto.items.map(
                    (item) => ({
                      testCode:
                        item.testCode,

                      codeSystem:
                        item.codeSystem,

                      testName:
                        item.testName,

                      specimenType:
                        item.specimenType,

                      status:
                        'ORDERED',
                    }),
                  ),
              },
            },

            include: {
              items:
                true,

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
        'LAB_ORDER_CREATE',

      resourceType:
        'LabOrder',

      resourceId:
        labOrder.id,

      patientId:
        labOrder.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      newValues: {
        orderNumber:
          labOrder.orderNumber,

        tests:
          dto.items.map(
            (item) =>
              item.testName,
          ),
      },
    });

    return labOrder;
  }

  async findOne(
    id: string,
    context?: RequestContext,
  ) {
    const order =
      await this.prisma.labOrder.findUnique({
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

          items: {
            include: {
              result:
                true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        'Laboratory order not found',
      );
    }

    if (context) {
      await this.auditService.log({
        userId:
          context.userId,

        eventType:
          'DATA_READ',

        action:
          'LAB_ORDER_READ',

        resourceType:
          'LabOrder',

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

    return this.prisma.labOrder.findMany({
      where: {
        patientId,
      },

      include: {
        items: {
          include: {
            result:
              true,
          },
        },

        encounter: {
          select: {
            id: true,
            encounterNumber: true,
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
    itemId: string,
    dto: CreateLabResultDto,
    context: RequestContext,
  ) {
    const item =
      await this.prisma.labOrderItem.findFirst({
        where: {
          id:
            itemId,

          labOrderId:
            orderId,
        },

        include: {
          labOrder:
            true,

          result:
            true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Laboratory order item not found',
      );
    }

    if (item.result) {
      throw new BadRequestException(
        'A result already exists for this laboratory order item',
      );
    }

    if (
      dto.valueNumeric ===
        undefined &&
      !dto.valueText
    ) {
      throw new BadRequestException(
        'valueNumeric or valueText is required',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const created =
            await tx.labResult.create({
              data: {
                labOrderItemId:
                  item.id,

                valueNumeric:
                  dto.valueNumeric,

                valueText:
                  dto.valueText,

                unit:
                  dto.unit,

                referenceRangeLow:
                  dto.referenceRangeLow,

                referenceRangeHigh:
                  dto.referenceRangeHigh,

                abnormalFlag:
                  dto.abnormalFlag,

                status:
                  dto.status ??
                  'FINAL',

                resultedAt:
                  dto.resultedAt
                    ? new Date(
                        dto.resultedAt,
                      )
                    : new Date(),

                verifiedByUserId:
                  context.userId,

                verifiedAt:
                  new Date(),
              },
            });

          await tx.labOrderItem.update({
            where: {
              id:
                item.id,
            },

            data: {
              status:
                'COMPLETED',
            },
          });

          const remaining =
            await tx.labOrderItem.count({
              where: {
                labOrderId:
                  orderId,

                status: {
                  not:
                    'COMPLETED',
                },
              },
            });

          if (remaining === 0) {
            await tx.labOrder.update({
              where: {
                id:
                  orderId,
              },

              data: {
                status:
                  'COMPLETED',
              },
            });
          } else {
            await tx.labOrder.update({
              where: {
                id:
                  orderId,
              },

              data: {
                status:
                  'IN_PROGRESS',
              },
            });
          }

          return created;
        },
      );

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_CREATE',

      action:
        'LAB_RESULT_CREATE',

      resourceType:
        'LabResult',

      resourceId:
        result.id,

      patientId:
        item.labOrder.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      newValues: {
        testName:
          item.testName,

        abnormalFlag:
          dto.abnormalFlag ??
          null,
      },
    });

    return result;
  }
}