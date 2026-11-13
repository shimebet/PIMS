import {
  BadRequestException,
  ForbiddenException,
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

  private async requireFacility(
    context: RequestContext & {
      facilityId?: string | null;
    },
  ): Promise<string> {
    if (!context.facilityId) {
      throw new ForbiddenException(
        'An active facility assignment is required',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        facilityId: true,
        status: true,
      },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.facilityId !== context.facilityId
    ) {
      throw new ForbiddenException(
        'Laboratory facility access denied',
      );
    }

    return context.facilityId;
  }
  async createOrder(
    encounterId: string,
    dto: CreateLabOrderDto,
    context: RequestContext,
  ) {
    const facilityId = await this.requireFacility(context);

    const encounter =
      await this.prisma.encounter.findFirst({
        where: {
          id: encounterId,
          facilityId,
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

      if (practitioner.facilityId !== facilityId) {
        throw new ForbiddenException(
          'Practitioner belongs to another facility',
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
    if (!context) {
      throw new ForbiddenException(
        'Laboratory request context is required',
      );
    }

    const facilityId = await this.requireFacility(context);

    const order =
      await this.prisma.labOrder.findFirst({
        where: {
          id,
          encounter: {
            facilityId,
          },
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
    context: RequestContext & {
      facilityId?: string | null;
    },
  ) {
    const facilityId = await this.requireFacility(context);
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
        encounter: {
          facilityId,
        },
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
    const facilityId = await this.requireFacility(context);

    if (dto.status !== undefined && dto.status !== 'PRELIMINARY') {
      throw new BadRequestException(
        'Result entry only supports PRELIMINARY status. Use verification to finalize results',
      );
    }

    const item = await this.prisma.labOrderItem.findFirst({
      where: {
        id: itemId,
        labOrderId: orderId,
        labOrder: {
          encounter: {
            facilityId,
          },
        },
      },
      include: {
        labOrder: true,
        result: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Laboratory order item not found');
    }

    if (item.result) {
      throw new BadRequestException(
        'A result already exists for this laboratory order item',
      );
    }

    if (
      dto.valueNumeric === undefined &&
      !dto.valueText?.trim()
    ) {
      throw new BadRequestException(
        'valueNumeric or valueText is required',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.labResult.create({
        data: {
          labOrderItemId: item.id,
          valueNumeric: dto.valueNumeric,
          valueText: dto.valueText,
          unit: dto.unit,
          referenceRangeLow: dto.referenceRangeLow,
          referenceRangeHigh: dto.referenceRangeHigh,
          abnormalFlag: dto.abnormalFlag,
          status: 'PRELIMINARY',
          resultedAt: dto.resultedAt
            ? new Date(dto.resultedAt)
            : new Date(),
          verifiedByUserId: null,
          verifiedAt: null,
        },
      });

      await tx.labOrderItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      await tx.labOrder.update({
        where: {
          id: orderId,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      return created;
    });

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_CREATE',
      action: 'LAB_RESULT_CREATE',
      resourceType: 'LabResult',
      resourceId: result.id,
      patientId: item.labOrder.patientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      newValues: {
        testName: item.testName,
        abnormalFlag: dto.abnormalFlag ?? null,
        status: 'PRELIMINARY',
      },
    });

    return result;
  }
  async verifyResult(
    orderId: string,
    itemId: string,
    context: RequestContext,
  ) {
    const facilityId = await this.requireFacility(context);

    const item = await this.prisma.labOrderItem.findFirst({
      where: {
        id: itemId,
        labOrderId: orderId,
        labOrder: {
          encounter: {
            facilityId,
          },
        },
      },
      include: {
        labOrder: true,
        result: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Laboratory order item not found',
      );
    }

    if (!item.result) {
      throw new BadRequestException(
        'A preliminary result is required before verification',
      );
    }

    if (
      item.result.status !== 'PRELIMINARY' ||
      item.result.verifiedAt !== null ||
      item.result.verifiedByUserId !== null
    ) {
      throw new BadRequestException(
        'Laboratory result is not eligible for verification',
      );
    }

    const verifiedAt = new Date();

    const verified = await this.prisma.$transaction(async (tx) => {
      // Serialize verification of items belonging to the same order.
      // The lock remains held until this transaction commits or rolls back.
      const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM LabOrder
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (lockedOrders.length !== 1) {
        throw new NotFoundException('Laboratory order not found');
      }

      const updated = await tx.labResult.updateMany({
        where: {
          id: item.result!.id,
          status: 'PRELIMINARY',
          verifiedAt: null,
          verifiedByUserId: null,
        },
        data: {
          status: 'FINAL',
          verifiedByUserId: context.userId,
          verifiedAt,
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException(
          'Result has already been verified or changed',
        );
      }

      await tx.labOrderItem.update({
        where: {
          id: itemId,
        },
        data: {
          status: 'COMPLETED',
        },
      });

      const remaining = await tx.labOrderItem.count({
        where: {
          labOrderId: orderId,
          status: {
            not: 'COMPLETED',
          },
        },
      });

      await tx.labOrder.update({
        where: {
          id: orderId,
        },
        data: {
          status: remaining === 0
            ? 'COMPLETED'
            : 'IN_PROGRESS',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: context.userId,
          eventType: 'DATA_UPDATE',
          action: 'LAB_RESULT_VERIFY',
          resourceType: 'LabResult',
          resourceId: item.result!.id,
          patientId: item.labOrder.patientId,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          requestId: context.requestId ?? null,
          oldValues: {
            status: 'PRELIMINARY',
          },
          newValues: {
            status: 'FINAL',
            verifiedByUserId: context.userId,
            verifiedAt: verifiedAt.toISOString(),
            testName: item.testName,
          },
          success: true,
        },
      });
      return tx.labResult.findUniqueOrThrow({
        where: {
          id: item.result!.id,
        },
      });
    });

return verified;
  }
}