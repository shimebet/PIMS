import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { CloseEncounterDto } from './dto/close-encounter.dto.js';
import { CreateVitalsDto } from './dto/create-vitals.dto.js';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto.js';
import { QueryEncountersDto } from './dto/query-encounters.dto.js';

import type {
  RequestContext,
} from '../../common/types/request-context.type.js';

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryEncountersDto) {
    const page = Math.max(1, query.page ?? 1);

    const limit = Math.min(
      100,
      Math.max(1, query.limit ?? 20),
    );

    const skip = (page - 1) * limit;

    const fromDate = query.fromDate
      ? new Date(query.fromDate)
      : undefined;

    const toDate = query.toDate
      ? new Date(query.toDate)
      : undefined;

    if (
      fromDate &&
      toDate &&
      fromDate.getTime() > toDate.getTime()
    ) {
      throw new BadRequestException(
        'fromDate must not be later than toDate',
      );
    }

    const where = {
      ...(query.patientId
        ? { patientId: query.patientId }
        : {}),

      ...(query.practitionerId
        ? { practitionerId: query.practitionerId }
        : {}),

      ...(query.status
        ? { status: query.status }
        : {}),

      ...(query.encounterType
        ? { encounterType: query.encounterType }
        : {}),

      ...(fromDate || toDate
        ? {
            startedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.encounter.findMany({
          where,
          skip,
          take: limit,

          select: {
            id: true,
            encounterNumber: true,
            encounterType: true,
            status: true,
            reasonForVisit: true,
            chiefComplaint: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,

            patientId: true,
            facilityId: true,
            practitionerId: true,

            patient: {
              select: {
                id: true,
                patientNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },

            facility: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: [
            { startedAt: 'desc' },
            { id: 'desc' },
          ],
        }),

        this.prisma.encounter.count({
          where,
        }),
      ]);

    return {
      items,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(
    dto: CreateEncounterDto,
    context: RequestContext,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id: dto.patientId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found',
      );
    }

    const facility =
      await this.prisma.facility.findUnique({
        where: {
          id: dto.facilityId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!facility) {
      throw new NotFoundException(
        'Facility not found',
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

    const encounter =
      await this.prisma.$transaction(
        async (tx) => {
          const sequence =
            await tx.numberSequence.update({
              where: {
                sequenceKey:
                  'ENCOUNTER_NUMBER',
              },

              data: {
                value: {
                  increment: 1,
                },
              },
            });

          const encounterNumber =
            `E${sequence.value
              .toString()
              .padStart(8, '0')}`;

          return tx.encounter.create({
            data: {
              encounterNumber,

              patientId:
                dto.patientId,

              facilityId:
                dto.facilityId,

              practitionerId:
                dto.practitionerId,

              encounterType:
                dto.encounterType,

              reasonForVisit:
                dto.reasonForVisit,

              chiefComplaint:
                dto.chiefComplaint,

              startedAt:
                dto.startedAt
                  ? new Date(dto.startedAt)
                  : new Date(),

              status:
                'IN_PROGRESS',
            },

            include: {
              patient: true,
              facility: true,
              practitioner: true,
            },
          });
        },
      );

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_CREATE',
      action: 'ENCOUNTER_CREATE',
      resourceType: 'Encounter',
      resourceId: encounter.id,
      patientId: encounter.patientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    return encounter;
  }

  async findOne(
    id: string,
    context?: RequestContext,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id,
        },

        include: {
          patient: true,
          facility: true,
          practitioner: true,

          observations: {
            orderBy: {
              observedAt: 'desc',
            },
          },

          diagnoses: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found',
      );
    }

    if (context) {
      await this.auditService.log({
        userId: context.userId,
        eventType: 'DATA_READ',
        action: 'ENCOUNTER_READ',
        resourceType: 'Encounter',
        resourceId: encounter.id,
        patientId: encounter.patientId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
    }

    return encounter;
  }

  async close(
    id: string,
    dto: CloseEncounterDto,
    context: RequestContext,
  ) {
    const encounter =
      await this.prisma.encounter.findUnique({
        where: {
          id,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Encounter not found',
      );
    }

    if (encounter.status === 'COMPLETED') {
      throw new BadRequestException(
        'Encounter is already completed',
      );
    }

    const updated =
      await this.prisma.encounter.update({
        where: {
          id,
        },

        data: {
          status: 'COMPLETED',

          endedAt:
            dto.endedAt
              ? new Date(dto.endedAt)
              : new Date(),
        },
      });

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_UPDATE',
      action: 'ENCOUNTER_CLOSE',
      resourceType: 'Encounter',
      resourceId: id,
      patientId: encounter.patientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    return updated;
  }

  async createVitals(
    encounterId: string,
    dto: CreateVitalsDto,
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
        'Cannot record vitals for a closed encounter',
      );
    }

    const observations: Array<{
      category: string;
      code: string;
      name: string;
      valueNumeric: number;
      unit: string;
    }> = [];

    if (
      dto.systolicBloodPressure !==
      undefined
    ) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '8480-6',
        name: 'Systolic blood pressure',
        valueNumeric:
          dto.systolicBloodPressure,
        unit: 'mmHg',
      });
    }

    if (
      dto.diastolicBloodPressure !==
      undefined
    ) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '8462-4',
        name: 'Diastolic blood pressure',
        valueNumeric:
          dto.diastolicBloodPressure,
        unit: 'mmHg',
      });
    }

    if (dto.pulseRate !== undefined) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '8867-4',
        name: 'Heart rate',
        valueNumeric:
          dto.pulseRate,
        unit: 'beats/min',
      });
    }

    if (
      dto.respiratoryRate !==
      undefined
    ) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '9279-1',
        name: 'Respiratory rate',
        valueNumeric:
          dto.respiratoryRate,
        unit: 'breaths/min',
      });
    }

    if (dto.temperature !== undefined) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '8310-5',
        name: 'Body temperature',
        valueNumeric:
          dto.temperature,
        unit: 'Cel',
      });
    }

    if (
      dto.oxygenSaturation !== undefined
    ) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '59408-5',
        name: 'Oxygen saturation',
        valueNumeric:
          dto.oxygenSaturation,
        unit: '%',
      });
    }

    if (dto.weight !== undefined) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '29463-7',
        name: 'Body weight',
        valueNumeric:
          dto.weight,
        unit: 'kg',
      });
    }

    if (dto.height !== undefined) {
      observations.push({
        category: 'VITAL_SIGNS',
        code: '8302-2',
        name: 'Body height',
        valueNumeric:
          dto.height,
        unit: 'cm',
      });
    }

    if (observations.length === 0) {
      throw new BadRequestException(
        'At least one vital sign is required',
      );
    }

    const created =
      await this.prisma.$transaction(
        observations.map(
          (observation) =>
            this.prisma.observation.create({
              data: {
                patientId:
                  encounter.patientId,

                encounterId:
                  encounter.id,

                recordedByUserId:
                  context.userId,

                category:
                  observation.category,

                code:
                  observation.code,

                name:
                  observation.name,

                valueNumeric:
                  observation.valueNumeric,

                unit:
                  observation.unit,

                status:
                  'FINAL',

                observedAt:
                  new Date(),
              },
            }),
        ),
      );

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_CREATE',
      action: 'VITAL_SIGNS_CREATE',
      resourceType: 'Observation',
      resourceId: encounter.id,
      patientId: encounter.patientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,

      newValues: {
        observationCodes:
          observations.map(
            (item) => item.code,
          ),
      },
    });

    return created;
  }

  async findVitals(
    encounterId: string,
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

    return this.prisma.observation.findMany({
      where: {
        encounterId,
        category: 'VITAL_SIGNS',
      },

      orderBy: {
        observedAt: 'desc',
      },
    });
  }

  async createDiagnosis(
    encounterId: string,
    dto: CreateDiagnosisDto,
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

    const diagnosis =
      await this.prisma.diagnosis.create({
        data: {
          patientId:
            encounter.patientId,

          encounterId:
            encounter.id,

          practitionerId:
            dto.practitionerId,

          code:
            dto.code,

          codeSystem:
            dto.codeSystem,

          description:
            dto.description,

          diagnosisType:
            dto.diagnosisType,

          onsetAt:
            dto.onsetAt
              ? new Date(dto.onsetAt)
              : null,

          status:
            'ACTIVE',
        },
      });

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_CREATE',
      action: 'DIAGNOSIS_CREATE',
      resourceType: 'Diagnosis',
      resourceId: diagnosis.id,
      patientId: encounter.patientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    return diagnosis;
  }

  async findDiagnoses(
    encounterId: string,
  ) {
    return this.prisma.diagnosis.findMany({
      where: {
        encounterId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}