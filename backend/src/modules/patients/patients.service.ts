import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  
    status?: 'ACTIVE' | 'INACTIVE',
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

    const where = {
      AND: [
        // Exclude soft-deleted patients from ordinary lists.
        ...(status
          ? [{ status }]
          : [{ status: { in: ['ACTIVE', 'INACTIVE'] } }]),
        ...(search ? [{
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
        }] : []),
      ],
    };

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

    if (!patient || patient.status === 'DELETED') {
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

    const updatedPatient = await this.prisma.$transaction(
      async (tx) => {
        // Reject updates to soft-deleted patients.
        const patient = await tx.patient.update({
          where: {
            id,
            status: {
              in: ['ACTIVE', 'INACTIVE'],
            },
          },
          data: {
            firstName: dto.firstName,
            middleName:
              dto.middleName == null
                ? dto.middleName
                : dto.middleName.trim() || null,
            lastName: dto.lastName,
            dateOfBirth:
              dto.dateOfBirth !== undefined
                ? new Date(dto.dateOfBirth)
                : undefined,
            birthDateEstimated: dto.birthDateEstimated,
            sexAtBirth: dto.sexAtBirth,
            gender: dto.gender,
            bloodGroup: dto.bloodGroup,
            maritalStatus: dto.maritalStatus,
            nationality: dto.nationality,
            preferredLanguage: dto.preferredLanguage,
            occupation: dto.occupation,
          },
        });

        if (dto.phone !== undefined) {
          const existingPhone =
            await tx.patientContact.findFirst({
              where: {
                patientId: id,
                contactType: 'PHONE',
              },
              orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' },
              ],
            });

          if (existingPhone) {
            if (existingPhone.contactValue !== dto.phone) {
              await tx.patientContact.update({
                where: {
                  id: existingPhone.id,
                },
                data: {
                  contactValue: dto.phone,
                  verified: false,
                },
              });
            }
          } else {
            await tx.patientContact.create({
              data: {
                patientId: id,
                contactType: 'PHONE',
                contactValue: dto.phone,
                isPrimary: true,
                verified: false,
              },
            });
          }
        }

        return patient;
      },
    );

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_UPDATE',
      action: 'PATIENT_UPDATE',
      resourceType: 'Patient',
      resourceId: id,
      patientId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      newValues: {
        changedFields: Object.keys(dto),
      },
      success: true,
    });

    return this.findOne(updatedPatient.id);
  }
  async activate(
    id: string,
    context: PatientRequestContext,
  ) {
    const patient = await this.findOne(id);

    if (patient.status !== 'INACTIVE') {
      throw new ConflictException(
        'Only inactive patients can be activated',
      );
    }

    const result = await this.prisma.patient.updateMany({
      where: {
        id,
        status: 'INACTIVE',
      },
      data: {
        status: 'ACTIVE',
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Patient status changed; please refresh and retry',
      );
    }

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_UPDATE',
      action: 'PATIENT_ACTIVATE',
      resourceType: 'Patient',
      resourceId: id,
      patientId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      oldValues: {
        status: 'INACTIVE',
      },
      newValues: {
        status: 'ACTIVE',
      },
      success: true,
    });

    return this.findOne(id);
  }
  async deactivate(
    id: string,
    context: PatientRequestContext,
  ) {
    const patient = await this.findOne(id);

    if (patient.status !== 'ACTIVE') {
      throw new ConflictException(
        'Only active patients can be deactivated',
      );
    }

    const result = await this.prisma.patient.updateMany({
      where: {
        id,
        status: 'ACTIVE',
      },
      data: {
        status: 'INACTIVE',
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Patient status changed; please refresh and retry',
      );
    }

    await this.auditService.log({
      userId: context.userId,
      eventType: 'DATA_UPDATE',
      action: 'PATIENT_DEACTIVATE',
      resourceType: 'Patient',
      resourceId: id,
      patientId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      oldValues: {
        status: 'ACTIVE',
      },
      newValues: {
        status: 'INACTIVE',
      },
      success: true,
    });

    return this.findOne(id);
  }
  // PATIENT_SOFT_DELETE_SERVICE_P12I19M
  async softDelete(
    id: string,
    reason: string,
    confirmation: string,
    context: PatientRequestContext,
  ) {
    if (
      typeof reason !== 'string' ||
      reason.trim().length < 10
    ) {
      throw new BadRequestException(
        'Deletion reason must contain at least 10 characters',
      );
    }

    if (confirmation !== 'DELETE') {
      throw new BadRequestException(
        'Explicit DELETE confirmation is required',
      );
    }

    if (!context?.userId) {
      throw new ForbiddenException(
        'Authenticated system administrator is required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: {
          id: context.userId,
        },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!actor || actor.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Active system administrator account required',
        );
      }

      const now = new Date();

      const authorized = actor.roles.some((assignment) =>
        assignment.role.code === 'SYSTEM_ADMIN' &&
        assignment.role.status === 'ACTIVE' &&
        (!assignment.validFrom ||
          assignment.validFrom <= now) &&
        (!assignment.validUntil ||
          assignment.validUntil >= now) &&
        assignment.role.permissions.some(
          (entry) =>
            entry.permission.code === 'patient.delete',
        ),
      );

      if (!authorized) {
        throw new ForbiddenException(
          'System administrator patient.delete permission required',
        );
      }

      const patient = await tx.patient.findUnique({
        where: { id },
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

      if (
        patient.status !== 'ACTIVE' &&
        patient.status !== 'INACTIVE'
      ) {
        throw new ConflictException(
          'Only active or inactive patients can be deleted',
        );
      }

      const result = await tx.patient.updateMany({
        where: {
          id,
          status: patient.status,
        },
        data: {
          status: 'DELETED',
        },
      });

      if (result.count !== 1) {
        throw new ConflictException(
          'Patient status changed; please refresh and retry',
        );
      }

      // Strict audit: failure rolls back the status change.
      await tx.auditLog.create({
        data: {
          userId: context.userId,
          eventType: 'DATA_UPDATE',
          action: 'PATIENT_SOFT_DELETE',
          resourceType: 'Patient',
          resourceId: id,
          patientId: id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
          oldValues: {
            status: patient.status,
          },
          newValues: {
            status: 'DELETED',
            reason: reason.trim(),
          },
          success: true,
        },
      });

      return {
        id,
        status: 'DELETED',
        previousStatus: patient.status,
      };
    });
  }
  // PATIENT_RESTORE_SERVICE_P12I19O
  async restore(
    id: string,
    reason: string,
    confirmation: string,
    context: PatientRequestContext,
  ) {
    if (
      typeof reason !== 'string' ||
      reason.trim().length < 10
    ) {
      throw new BadRequestException(
        'Restoration reason must contain at least 10 characters',
      );
    }

    if (confirmation !== 'RESTORE') {
      throw new BadRequestException(
        'Explicit RESTORE confirmation is required',
      );
    }

    if (!context?.userId) {
      throw new ForbiddenException(
        'Authenticated system administrator is required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: {
          id: context.userId,
        },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!actor || actor.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Active system administrator account required',
        );
      }

      const now = new Date();

      const authorized = actor.roles.some((assignment) =>
        assignment.role.code === 'SYSTEM_ADMIN' &&
        assignment.role.status === 'ACTIVE' &&
        (!assignment.validFrom ||
          assignment.validFrom <= now) &&
        (!assignment.validUntil ||
          assignment.validUntil >= now) &&
        assignment.role.permissions.some(
          (entry) =>
            entry.permission.code === 'patient.restore',
        ),
      );

      if (!authorized) {
        throw new ForbiddenException(
          'System administrator patient.restore permission required',
        );
      }

      const patient = await tx.patient.findUnique({
        where: { id },
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

      if (patient.status !== 'DELETED') {
        throw new ConflictException(
          'Only deleted patients can be restored',
        );
      }

      // PATIENT_RESTORE_HISTORY_CHECK_P12I19U
      const deletionAudit = await tx.auditLog.findFirst({
        where: {
          patientId: id,
          action: {
            in: ['PATIENT_SOFT_DELETE', 'PATIENT_RESTORE'],
          },
          success: true,
        },
        orderBy: [
          { occurredAt: 'desc' },
          { id: 'desc' },
        ],
      });

      if (!deletionAudit) {
        throw new ConflictException(
          'Original patient status could not be verified',
        );
      }

      if (deletionAudit.action !== 'PATIENT_SOFT_DELETE') {
        throw new ConflictException(
          'Latest patient lifecycle event is not a deletion',
        );
      }

      // PATIENT_RESTORE_AUDIT_INTEGRITY_P12I19R
      if (
        deletionAudit.patientId !== id ||
        deletionAudit.resourceId !== id ||
        deletionAudit.resourceType !== 'Patient' ||
        deletionAudit.action !== 'PATIENT_SOFT_DELETE' ||
        deletionAudit.success !== true
      ) {
        throw new ConflictException(
          'Patient deletion audit identity is invalid',
        );
      }

      const newValues = deletionAudit.newValues;

      if (
        !newValues ||
        typeof newValues !== 'object' ||
        Array.isArray(newValues) ||
        !('status' in newValues) ||
        newValues.status !== 'DELETED'
      ) {
        throw new ConflictException(
          'Patient deletion audit transition is invalid',
        );
      }

      const oldValues = deletionAudit.oldValues;

      if (
        !oldValues ||
        typeof oldValues !== 'object' ||
        Array.isArray(oldValues) ||
        !('status' in oldValues)
      ) {
        throw new ConflictException(
          'Original patient status could not be verified',
        );
      }

      const previousStatus = oldValues.status;

      if (
        previousStatus !== 'ACTIVE' &&
        previousStatus !== 'INACTIVE'
      ) {
        throw new ConflictException(
          'Original patient status is invalid',
        );
      }

      const result = await tx.patient.updateMany({
        where: {
          id,
          status: 'DELETED',
        },
        data: {
          status: previousStatus,
        },
      });

      if (result.count !== 1) {
        throw new ConflictException(
          'Patient status changed; please refresh and retry',
        );
      }

      // Strict audit: failure rolls back restoration.
      await tx.auditLog.create({
        data: {
          userId: context.userId,
          eventType: 'DATA_UPDATE',
          action: 'PATIENT_RESTORE',
          resourceType: 'Patient',
          resourceId: id,
          patientId: id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          requestId: context.requestId,
          oldValues: {
            status: 'DELETED',
            deletionAuditId: deletionAudit.id,
          },
          newValues: {
            status: previousStatus,
            reason: reason.trim(),
          },
          success: true,
        },
      });

      return {
        id,
        status: previousStatus,
        previousStatus: 'DELETED',
      };
    });
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