import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { DuplicateCheckDto } from './dto/duplicate-check.dto.js';

import type {
  PatientRequestContext,
} from './patient-request-context.type.js';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreatePatientDto,
    context: PatientRequestContext,
  ) {
    const duplicate =
      await this.checkDuplicate({
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        sexAtBirth: dto.sexAtBirth,
        phone: dto.contacts?.find(
          (contact) =>
            contact.contactType === 'PHONE',
        )?.contactValue,
      });

    if (
      duplicate.possibleDuplicates.length > 0
    ) {
      throw new ConflictException({
        message:
          'Possible duplicate patient found',
        possibleDuplicates:
          duplicate.possibleDuplicates,
      });
    }

    const patient =
      await this.prisma.$transaction(
        async (tx) => {
          const sequence =
            await tx.numberSequence.update({
              where: {
                sequenceKey:
                  'PATIENT_NUMBER',
              },
              data: {
                value: {
                  increment: 1,
                },
              },
            });

          const patientNumber =
            `P${sequence.value
              .toString()
              .padStart(8, '0')}`;

          return tx.patient.create({
            data: {
              patientNumber,

              firstName:
                dto.firstName,

              middleName:
                dto.middleName,

              lastName:
                dto.lastName,

              dateOfBirth:
                dto.dateOfBirth
                  ? new Date(
                      dto.dateOfBirth,
                    )
                  : null,

              birthDateEstimated:
                dto.birthDateEstimated ??
                false,

              sexAtBirth:
                dto.sexAtBirth,

              gender:
                dto.gender,

              bloodGroup:
                dto.bloodGroup,

              maritalStatus:
                dto.maritalStatus,

              nationality:
                dto.nationality,

              preferredLanguage:
                dto.preferredLanguage,

              occupation:
                dto.occupation,

              registrationFacilityId:
                dto.registrationFacilityId,

              identifiers:
                dto.identifiers
                  ? {
                      create:
                        dto.identifiers.map(
                          (
                            identifier,
                          ) => ({
                            identifierType:
                              identifier.identifierType,

                            identifierValue:
                              identifier.identifierValue,

                            issuingAuthority:
                              identifier.issuingAuthority,

                            country:
                              identifier.country,

                            isPrimary:
                              identifier.isPrimary ??
                              false,
                          }),
                        ),
                    }
                  : undefined,

              contacts:
                dto.contacts
                  ? {
                      create:
                        dto.contacts.map(
                          (
                            contact,
                          ) => ({
                            contactType:
                              contact.contactType,

                            contactValue:
                              contact.contactValue,

                            isPrimary:
                              contact.isPrimary ??
                              false,
                          }),
                        ),
                    }
                  : undefined,

              addresses:
                dto.addresses
                  ? {
                      create:
                        dto.addresses.map(
                          (
                            address,
                          ) => ({
                            country:
                              address.country,

                            region:
                              address.region,

                            zone:
                              address.zone,

                            district:
                              address.district,

                            city:
                              address.city,

                            subCity:
                              address.subCity,

                            kebele:
                              address.kebele,

                            street:
                              address.street,

                            houseNumber:
                              address.houseNumber,

                            isPrimary:
                              address.isPrimary ??
                              false,
                          }),
                        ),
                    }
                  : undefined,
            },

            include: {
              identifiers: true,
              contacts: true,
              addresses: true,
              registrationFacility:
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
        'PATIENT_CREATE',

      resourceType:
        'Patient',

      resourceId:
        patient.id,

      patientId:
        patient.id,

      ipAddress:
        context.ipAddress,

      userAgent:
        context.userAgent,

      requestId:
        context.requestId,

      success:
        true,
    });

    return patient;
  }

  async findAll(
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const safePage =
      page < 1 ? 1 : page;

    const safeLimit =
      limit < 1
        ? 20
        : Math.min(
            limit,
            100,
          );

    const skip =
      (safePage - 1) *
      safeLimit;

    const where = search
      ? {
          OR: [
            {
              patientNumber: {
                contains:
                  search,
              },
            },
            {
              medicalRecordNumber: {
                contains:
                  search,
              },
            },
            {
              firstName: {
                contains:
                  search,
              },
            },
            {
              middleName: {
                contains:
                  search,
              },
            },
            {
              lastName: {
                contains:
                  search,
              },
            },
            {
              identifiers: {
                some: {
                  identifierValue: {
                    contains:
                      search,
                  },
                },
              },
            },
            {
              contacts: {
                some: {
                  contactValue: {
                    contains:
                      search,
                  },
                },
              },
            },
          ],
        }
      : undefined;

    const [
      items,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.patient.findMany({
          where,

          skip,

          take:
            safeLimit,

          include: {
            contacts: {
              where: {
                isPrimary:
                  true,
              },
            },

            identifiers: {
              where: {
                isPrimary:
                  true,
              },
            },
          },

          orderBy: {
            createdAt:
              'desc',
          },
        }),

        this.prisma.patient.count({
          where,
        }),
      ]);

    return {
      items,

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit,
          ),
      },
    };
  }

  async findOne(
    id: string,
    context?: PatientRequestContext,
  ) {
    const patient =
      await this.prisma.patient.findUnique({
        where: {
          id,
        },

        include: {
          registrationFacility:
            true,

          identifiers:
            true,

          contacts:
            true,

          addresses:
            true,
        },
      });

    if (!patient) {
      throw new NotFoundException(
        'Patient not found',
      );
    }

    if (context) {
      await this.auditService.log({
        userId:
          context.userId,

        eventType:
          'DATA_READ',

        action:
          'PATIENT_READ',

        resourceType:
          'Patient',

        resourceId:
          patient.id,

        patientId:
          patient.id,

        ipAddress:
          context.ipAddress,

        userAgent:
          context.userAgent,

        requestId:
          context.requestId,

        success:
          true,
      });
    }

    return patient;
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    context: PatientRequestContext,
  ) {
    await this.findOne(id);

    const updatedPatient =
      await this.prisma.patient.update({
        where: {
          id,
        },

        data: {
          firstName:
            dto.firstName,

          middleName:
            dto.middleName,

          lastName:
            dto.lastName,

          dateOfBirth:
            dto.dateOfBirth !==
            undefined
              ? new Date(
                  dto.dateOfBirth,
                )
              : undefined,

          birthDateEstimated:
            dto.birthDateEstimated,

          sexAtBirth:
            dto.sexAtBirth,

          gender:
            dto.gender,

          bloodGroup:
            dto.bloodGroup,

          maritalStatus:
            dto.maritalStatus,

          nationality:
            dto.nationality,

          preferredLanguage:
            dto.preferredLanguage,

          occupation:
            dto.occupation,

          status:
            dto.status,
        },

        include: {
          identifiers:
            true,

          contacts:
            true,

          addresses:
            true,
        },
      });

    await this.auditService.log({
      userId:
        context.userId,

      eventType:
        'DATA_UPDATE',

      action:
        'PATIENT_UPDATE',

      resourceType:
        'Patient',

      resourceId:
        id,

      patientId:
        id,

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

      success:
        true,
    });

    return updatedPatient;
  }

  async checkDuplicate(
    dto: DuplicateCheckDto,
  ) {
    const possibleDuplicates =
      await this.prisma.patient.findMany({
        where: {
          OR: [
            {
              AND: [
                {
                  firstName:
                    dto.firstName,
                },
                {
                  lastName:
                    dto.lastName,
                },
                ...(dto.dateOfBirth
                  ? [
                      {
                        dateOfBirth:
                          new Date(
                            dto.dateOfBirth,
                          ),
                      },
                    ]
                  : []),
              ],
            },

            ...(dto.phone
              ? [
                  {
                    contacts: {
                      some: {
                        contactValue:
                          dto.phone,
                      },
                    },
                  },
                ]
              : []),
          ],
        },

        select: {
          id:
            true,

          patientNumber:
            true,

          firstName:
            true,

          middleName:
            true,

          lastName:
            true,

          dateOfBirth:
            true,

          sexAtBirth:
            true,

          status:
            true,

          contacts: {
            where: {
              isPrimary:
                true,
            },

            select: {
              contactType:
                true,

              contactValue:
                true,

              isPrimary:
                true,
            },
          },
        },

        take:
          10,
      });

    return {
      possibleDuplicates,
    };
  }
}