import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateMedicationOrderDto } from './dto/create-medication-order.dto.js';
import { CancelMedicationOrderDto } from './dto/cancel-medication-order.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    encounterId: string,
    dto: CreateMedicationOrderDto,
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
        'Medication cannot be prescribed for a completed encounter',
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

    const medicationOrder =
      await this.prisma.$transaction(
        async (tx) => {
          const sequence =
            await tx.numberSequence.update({
              where: {
                sequenceKey:
                  'PRESCRIPTION_NUMBER',
              },

              data: {
                value: {
                  increment: 1,
                },
              },
            });

          const prescriptionNumber =
            `RX${sequence.value
              .toString()
              .padStart(8, '0')}`;

          return tx.medicationOrder.create({
            data: {
              patientId:
                encounter.patientId,

              encounterId:
                encounter.id,

              practitionerId:
                dto.practitionerId,

              prescriptionNumber,

              medicationCode:
                dto.medicationCode,

              codeSystem:
                dto.codeSystem,

              medicationName:
                dto.medicationName,

              strength:
                dto.strength,

              dose:
                dto.dose,

              doseUnit:
                dto.doseUnit,

              route:
                dto.route,

              frequency:
                dto.frequency,

              durationDays:
                dto.durationDays,

              quantity:
                dto.quantity,

              instructions:
                dto.instructions,

              status:
                'ACTIVE',

              startDate:
                dto.startDate
                  ? new Date(dto.startDate)
                  : new Date(),

              endDate:
                dto.endDate
                  ? new Date(dto.endDate)
                  : null,

              prescribedAt:
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
        'MEDICATION_ORDER_CREATE',

      resourceType:
        'MedicationOrder',

      resourceId:
        medicationOrder.id,

      patientId:
        medicationOrder.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      success:
        true,
    });

    return medicationOrder;
  }

  async findOne(
    id: string,
    context?: RequestContext,
  ) {
    const medication =
      await this.prisma.medicationOrder.findUnique({
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

          encounter:
            true,

          practitioner:
            true,
        },
      });

    if (!medication) {
      throw new NotFoundException(
        'Medication order not found',
      );
    }

    if (context) {
      await this.auditService.log({
        userId:
          context.userId,

        eventType:
          'DATA_READ',

        action:
          'MEDICATION_ORDER_READ',

        resourceType:
          'MedicationOrder',

        resourceId:
          medication.id,

        patientId:
          medication.patientId,

        ipAddress:
          context.ipAddress,

        userAgent:
          context.userAgent,

        requestId:
          context.requestId,
      });
    }

    return medication;
  }

  async findByEncounter(
    encounterId: string,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id: encounterId,
        },

        select: {
          id: true,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found',
      );
    }

    return this.prisma.medicationOrder.findMany({
      where: {
        encounterId,
      },

      include: {
        practitioner:
          true,
      },

      orderBy: {
        prescribedAt:
          'desc',
      },
    });
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

    return this.prisma.medicationOrder.findMany({
      where: {
        patientId,
      },

      include: {
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
        prescribedAt:
          'desc',
      },
    });
  }

  async cancel(
    id: string,
    dto: CancelMedicationOrderDto,
    context: RequestContext,
  ) {
    const medication =
      await this.prisma.medicationOrder.findUnique({
        where: {
          id,
        },
      });

    if (!medication) {
      throw new NotFoundException(
        'Medication order not found',
      );
    }

    if (
      medication.status ===
      'CANCELLED'
    ) {
      throw new BadRequestException(
        'Medication order is already cancelled',
      );
    }

    const updated =
      await this.prisma.medicationOrder.update({
        where: {
          id,
        },

        data: {
          status:
            'CANCELLED',
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_UPDATE',

      action:
        'MEDICATION_ORDER_CANCEL',

      resourceType:
        'MedicationOrder',

      resourceId:
        medication.id,

      patientId:
        medication.patientId,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      newValues: {
        status:
          'CANCELLED',

        reason:
          dto.reason ?? null,
      },

      success:
        true,
    });

    return updated;
  }
}