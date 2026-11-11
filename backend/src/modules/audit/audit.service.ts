import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import type { CreateAuditLogInput } from './audit.types.js';

interface AuditQuery {
  page?: number;
  limit?: number;
  action?: string;
  eventType?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async log(
    input: CreateAuditLogInput,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId:
            input.userId ?? null,

          eventType:
            input.eventType,

          action:
            input.action,

          resourceType:
            input.resourceType ?? null,

          resourceId:
            input.resourceId ?? null,

          patientId:
            input.patientId ?? null,

          ipAddress:
            input.ipAddress ?? null,

          userAgent:
            input.userAgent ?? null,

          requestId:
            input.requestId ?? null,

          oldValues:
            input.oldValues
              ? JSON.parse(
                  JSON.stringify(
                    input.oldValues,
                  ),
                )
              : undefined,

          newValues:
            input.newValues
              ? JSON.parse(
                  JSON.stringify(
                    input.newValues,
                  ),
                )
              : undefined,

          success:
            input.success ?? true,

          failureReason:
            input.failureReason ?? null,
        },
      });
    } catch (error) {
      console.error(
        'Audit logging failed:',
        error,
      );
    }
  }

  async findAll(
    query: AuditQuery,
  ) {
    const page =
      query.page && query.page > 0
        ? query.page
        : 1;

    const limit =
      query.limit && query.limit > 0
        ? Math.min(
            query.limit,
            100,
          )
        : 50;

    const skip =
      (page - 1) * limit;

    const where = {
      ...(query.action
        ? {
            action:
              query.action,
          }
        : {}),

      ...(query.eventType
        ? {
            eventType:
              query.eventType,
          }
        : {}),
    };

    const [
      items,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,

          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },

          orderBy: {
            occurredAt:
              'desc',
          },
        }),

        this.prisma.auditLog.count({
          where,
        }),
      ]);

    return {
      items,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total /
              limit,
          ),
      },
    };
  }

  async findByPatient(
    patientId: string,
    page = 1,
    limit = 50,
  ) {
    const safePage =
      page < 1 ? 1 : page;

    const safeLimit =
      limit < 1
        ? 50
        : Math.min(
            limit,
            100,
          );

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      items,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          where: {
            patientId,
          },

          skip,

          take:
            safeLimit,

          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },

          orderBy: {
            occurredAt:
              'desc',
          },
        }),

        this.prisma.auditLog.count({
          where: {
            patientId,
          },
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

  async findByUser(
    userId: string,
    page = 1,
    limit = 50,
  ) {
    const safePage =
      page < 1 ? 1 : page;

    const safeLimit =
      limit < 1
        ? 50
        : Math.min(
            limit,
            100,
          );

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      items,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          where: {
            userId,
          },

          skip,

          take:
            safeLimit,

          orderBy: {
            occurredAt:
              'desc',
          },
        }),

        this.prisma.auditLog.count({
          where: {
            userId,
          },
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
}