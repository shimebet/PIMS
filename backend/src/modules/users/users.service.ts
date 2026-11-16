import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import argon2 from 'argon2';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { RoleAssignmentMode } from './dto/assign-role.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async requirePermission(
    tx: Pick<PrismaService, 'user'>,
    actorUserId: string,
    permissionCode: string,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!actor || actor.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Administrator account is not active',
      );
    }

    const now = new Date();

    const authorized = actor.roles.some((assignment) =>
      (!assignment.validFrom || assignment.validFrom <= now) &&
      (!assignment.validUntil || assignment.validUntil >= now) &&
      assignment.role.status === 'ACTIVE' &&
      assignment.role.permissions.some(
        (entry) => entry.permission.code === permissionCode,
      )
    );

    if (!authorized) {
      throw new ForbiddenException(
        'Administrator lacks required permission',
      );
    }
  }

  async create(dto: CreateUserDto, actorUserId: string) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      await this.requirePermission(
        tx as never,
        actorUserId,
        'user.create',
      );

      const existing = await tx.user.findUnique({
        where: { username: dto.username },
      });

      if (existing) {
        throw new ConflictException('Username already exists');
      }

      if (dto.email) {
        const emailExists = await tx.user.findUnique({
          where: { email: dto.email },
        });

        if (emailExists) {
          throw new ConflictException('Email already exists');
        }
      }

      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          facilityId: dto.facilityId,
          departmentId: dto.departmentId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          firstName: true,
          middleName: true,
          lastName: true,
          facilityId: true,
          departmentId: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_CREATE',
          resourceType: 'User',
          resourceId: user.id,
          newValues: {
            username: user.username,
            status: user.status,
            facilityId: user.facilityId,
            departmentId: user.departmentId,
          },
          success: true,
        },
      });

      return user;
    });
  }
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,

        firstName: true,
        middleName: true,
        lastName: true,

        facilityId: true,
        departmentId: true,

        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,

        createdAt: true,
        updatedAt: true,

        roles: {
          include: {
            role: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
          facility: true,
          department: true,

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

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    const {
      passwordHash,
      ...safeUser
    } = user;

    return safeUser;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorUserId: string,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.requirePermission(
        tx as never,
        actorUserId,
        'user.update',
      );

      const existing = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          middleName: true,
          lastName: true,
          facilityId: true,
          departmentId: true,
        },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      if (dto.email) {
        const emailExists = await tx.user.findFirst({
          where: {
            email: dto.email,
            NOT: { id },
          },
        });

        if (emailExists) {
          throw new ConflictException('Email already exists');
        }
      }

      const updated = await tx.user.update({
        where: { id },
        data: {
          email: dto.email,
          phone: dto.phone,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          facilityId: dto.facilityId,
          departmentId: dto.departmentId,
        },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          firstName: true,
          middleName: true,
          lastName: true,
          facilityId: true,
          departmentId: true,
          status: true,
          updatedAt: true,
        },
      });

      const fields = [
        'email',
        'phone',
        'firstName',
        'middleName',
        'lastName',
        'facilityId',
        'departmentId',
      ] as const;

      const oldValues: Record<string, string | null> = {};
      const newValues: Record<string, string | null> = {};

      for (const field of fields) {
        if (
          dto[field] !== undefined &&
          existing[field] !== updated[field]
        ) {
          oldValues[field] = existing[field];
          newValues[field] = updated[field];
        }
      }

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_UPDATE',
          resourceType: 'User',
          resourceId: id,
          oldValues,
          newValues,
          success: true,
        },
      });

      return updated;
    });
  }
  private async requireUserManager(
    tx: Pick<PrismaService, 'user'>,
    actorUserId: string,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!actor || actor.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Administrator account is not active',
      );
    }

    const now = new Date();

    const authorized = actor.roles.some((assignment) => {
      const validFrom =
        !assignment.validFrom ||
        assignment.validFrom <= now;

      const validUntil =
        !assignment.validUntil ||
        assignment.validUntil >= now;

      return (
        validFrom &&
        validUntil &&
        assignment.role.status === 'ACTIVE' &&
        assignment.role.permissions.some(
          (entry) => entry.permission.code === 'user.manage',
        )
      );
    });

    if (!authorized) {
      throw new ForbiddenException(
        'Administrator lacks user management permission',
      );
    }
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actorUserId: string,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    if (id === actorUserId) {
      throw new ForbiddenException(
        'You cannot reset your own password',
      );
    }

    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      newPassword.length > 128
    ) {
      throw new ForbiddenException(
        'Temporary password must contain 12 to 128 characters',
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    return this.prisma.$transaction(async (tx) => {
      await this.requireUserManager(
        tx as never,
        actorUserId,
      );

      const target = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          status: true,
          passwordHash: true,
        },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (target.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Only active users can have their password reset',
        );
      }

      const passwordReused = await argon2.verify(
        target.passwordHash,
        newPassword,
      );

      if (passwordReused) {
        throw new ConflictException(
          'Temporary password must differ from current password',
        );
      }

      const updated = await tx.user.updateMany({
        where: {
          id,
          status: 'ACTIVE',
          passwordHash: target.passwordHash,
        },
        data: {
          passwordHash,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'User account changed concurrently. Please retry.',
        );
      }

      await tx.session.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_PASSWORD_RESET',
          resourceType: 'User',
          resourceId: id,
          success: true,
        },
      });

      return {
        message:
          'Password reset successfully. User must change password at next sign-in.',
        userId: id,
        mustChangePassword: true,
      };
    });
  }
  async lock(id: string, actorUserId: string) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    if (id === actorUserId) {
      throw new ForbiddenException(
        'You cannot lock your own account',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lockedRoles = await tx.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT id
        FROM Role
        WHERE code = 'SYSTEM_ADMIN'
        FOR UPDATE
      `;

      if (lockedRoles.length !== 1) {
        throw new ConflictException(
          'System administrator role is unavailable',
        );
      }

      await this.requireUserManager(tx as never, actorUserId);

      const target = await tx.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (target.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Only active user accounts can be locked',
        );
      }

      const privilegedCodes = [
        'SYSTEM_ADMIN',
        'OFFICE_MANAGER',
      ];

      const now = new Date();

      const isPrivileged = target.roles.some((assignment) =>
        privilegedCodes.includes(assignment.role.code) &&
        assignment.role.status === 'ACTIVE' &&
        (!assignment.validFrom || assignment.validFrom <= now) &&
        (!assignment.validUntil || assignment.validUntil >= now)
      );

      if (target.status === 'ACTIVE' && isPrivileged) {
        const remaining = await tx.user.count({
          where: {
            id: { not: id },
            status: 'ACTIVE',
            roles: {
              some: {
                role: {
                  code: { in: privilegedCodes },
                  status: 'ACTIVE',
                },
                OR: [
                  { validFrom: null },
                  { validFrom: { lte: now } },
                ],
                AND: [
                  {
                    OR: [
                      { validUntil: null },
                      { validUntil: { gte: now } },
                    ],
                  },
                ],
              },
            },
          },
        });

        if (remaining === 0) {
          throw new ForbiddenException(
            'Cannot lock the last active administrator',
          );
        }
      }

      const changed = await tx.user.updateMany({
        where: {
          id,
          status: 'ACTIVE',
        },
        data: {
          status: 'LOCKED',
          lockedUntil: null,
        },
      });

      if (changed.count !== 1) {
        throw new ConflictException(
          'User account changed concurrently. Please retry.',
        );
      }

      const updated = await tx.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_LOCK',
          resourceType: 'User',
          resourceId: id,
          oldValues: { status: target.status },
          newValues: { status: 'LOCKED' },
          success: true,
        },
      });

      return updated;
    }, { isolationLevel: 'ReadCommitted' });
  }

  async unlock(id: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireUserManager(tx as never, actorUserId);

      const target = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
        },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (target.status !== 'LOCKED') {
        throw new ForbiddenException(
          'Only locked user accounts can be unlocked',
        );
      }

      const updated = await tx.user.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_UNLOCK',
          resourceType: 'User',
          resourceId: id,
          oldValues: { status: target.status },
          newValues: { status: 'ACTIVE' },
          success: true,
        },
      });

      return updated;
    });
  }
  async retire(
    id: string,
    reason: string,
    confirmation: string,
    actorUserId: string,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    if (id === actorUserId) {
      throw new ForbiddenException(
        'You cannot retire your own account',
      );
    }

    if (confirmation !== 'DELETE') {
      throw new ForbiddenException(
        'Type DELETE to confirm account retirement',
      );
    }

    if (
      typeof reason !== 'string' ||
      reason.trim().length < 10 ||
      reason.length > 500
    ) {
      throw new ForbiddenException(
        'Retirement reason must contain 10 to 500 characters',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lockedRoles = await tx.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT id
        FROM Role
        WHERE code = 'SYSTEM_ADMIN'
        FOR UPDATE
      `;

      if (lockedRoles.length !== 1) {
        throw new ConflictException(
          'System administrator role is unavailable',
        );
      }

      const actor = await tx.user.findUnique({
        where: { id: actorUserId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!actor || actor.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Administrator account is not active',
        );
      }

      const now = new Date();

      const isSystemAdmin = actor.roles.some(
        (assignment) =>
          assignment.role.code === 'SYSTEM_ADMIN' &&
          assignment.role.status === 'ACTIVE' &&
          (!assignment.validFrom ||
            assignment.validFrom <= now) &&
          (!assignment.validUntil ||
            assignment.validUntil >= now) &&
          assignment.role.permissions.some(
            (entry) =>
              entry.permission.code === 'user.manage',
          ),
      );

      if (!isSystemAdmin) {
        throw new ForbiddenException(
          'Only an authorized system administrator can retire users',
        );
      }

      const target = await tx.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (
        target.status === 'RETIRED' ||
        target.status === 'DELETED'
      ) {
        throw new ConflictException(
          'User account is already retired or deleted',
        );
      }

      const privilegedCodes = [
        'SYSTEM_ADMIN',
        'OFFICE_MANAGER',
      ];

      const isPrivileged = target.roles.some(
        (assignment) =>
          privilegedCodes.includes(
            assignment.role.code,
          ) &&
          assignment.role.status === 'ACTIVE' &&
          (!assignment.validFrom ||
            assignment.validFrom <= now) &&
          (!assignment.validUntil ||
            assignment.validUntil >= now),
      );

      if (
        target.status === 'ACTIVE' &&
        isPrivileged
      ) {
        const remaining = await tx.user.count({
          where: {
            id: { not: id },
            status: 'ACTIVE',
            roles: {
              some: {
                role: {
                  code: { in: privilegedCodes },
                  status: 'ACTIVE',
                },
                OR: [
                  { validFrom: null },
                  { validFrom: { lte: now } },
                ],
                AND: [
                  {
                    OR: [
                      { validUntil: null },
                      { validUntil: { gte: now } },
                    ],
                  },
                ],
              },
            },
          },
        });

        if (remaining === 0) {
          throw new ForbiddenException(
            'Cannot retire the last active administrator',
          );
        }
      }

      const updated = await tx.user.updateMany({
        where: {
          id,
          status: target.status,
        },
        data: {
          status: 'RETIRED',
          lockedUntil: null,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'User account changed concurrently. Please retry.',
        );
      }

      await tx.session.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action: 'USER_RETIRE',
          resourceType: 'User',
          resourceId: id,
          oldValues: {
            status: target.status,
          },
          newValues: {
            status: 'RETIRED',
            reason: reason.trim(),
          },
          success: true,
        },
      });

      return {
        userId: id,
        status: 'RETIRED',
        message: 'User account retired successfully',
      };
    }, { isolationLevel: 'ReadCommitted' });
  }
  async assignRole(
    userId: string,
    roleCode: string,
    actorUserId: string,
    mode: RoleAssignmentMode = RoleAssignmentMode.REPLACE,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException(
        'Authenticated administrator is required',
      );
    }

    if (userId === actorUserId) {
      throw new ForbiddenException(
        'You cannot assign a role to yourself',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: actorUserId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!actor || actor.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Administrator account is not active',
        );
      }

      const now = new Date();

      const canManageRoles = actor.roles.some((assignment) => {
        const validFrom =
          !assignment.validFrom ||
          assignment.validFrom <= now;

        const validUntil =
          !assignment.validUntil ||
          assignment.validUntil >= now;

        return (
          validFrom &&
          validUntil &&
          assignment.role.status === 'ACTIVE' &&
          assignment.role.permissions.some(
            (entry) => entry.permission.code === 'role.manage',
          )
        );
      });

      if (!canManageRoles) {
        throw new ForbiddenException(
          'Administrator lacks role management permission',
        );
      }

      const target = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (
        target.status === 'RETIRED' ||
        target.status === 'DELETED'
      ) {
        throw new ForbiddenException(
          'Cannot assign roles to retired or deleted accounts',
        );
      }

      const role = await tx.role.findUnique({
        where: { code: roleCode },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      if (role.status !== 'ACTIVE') {
        throw new ForbiddenException(
          'Cannot assign an inactive role',
        );
      }

      const previousAssignments = await tx.userRole.findMany({
        where: { userId },
        include: { role: true },
      });

      const previousRoleCodes = previousAssignments.map(
        (assignment) => assignment.role.code,
      );

      const selectedAssignment = previousAssignments.find(
        (assignment) => assignment.roleId === role.id,
      );

      const selectedRoleActive = Boolean(
        selectedAssignment &&
        (!selectedAssignment.validFrom ||
          selectedAssignment.validFrom <= now) &&
        (!selectedAssignment.validUntil ||
          selectedAssignment.validUntil >= now),
      );

      const alreadyAssigned =
        selectedRoleActive &&
        (mode === RoleAssignmentMode.ADD ||
          (previousAssignments.length === 1 &&
            mode === RoleAssignmentMode.REPLACE));

      if (alreadyAssigned) {
        return {
          message: 'Role already assigned',
          userId,
          roleCode: role.code,
          previousRoles: previousRoleCodes,
        };
      }

      const removingSystemAdmin =
        role.code !== 'SYSTEM_ADMIN' &&
        previousRoleCodes.includes('SYSTEM_ADMIN');

      if (mode === RoleAssignmentMode.REPLACE && removingSystemAdmin) {
        const otherAdministrators = await tx.user.count({
          where: {
            id: { not: userId },
            status: 'ACTIVE',
            roles: {
              some: {
                role: {
                  code: 'SYSTEM_ADMIN',
                  status: 'ACTIVE',
                },
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: new Date() } },
                ],
              },
            },
          },
        });

        if (otherAdministrators === 0) {
          throw new ForbiddenException(
            'Cannot remove the last active system administrator',
          );
        }
      }

      if (mode === RoleAssignmentMode.REPLACE) {
        await tx.userRole.deleteMany({
          where: {
            userId,
            roleId: { not: role.id },
          },
        });
      }

      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id,
          },
        },
        update: {
          validFrom: new Date(),
          validUntil: null,
        },
        create: {
          userId,
          roleId: role.id,
        },
      });

      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          eventType: 'SECURITY',
          action:
            mode === RoleAssignmentMode.ADD
              ? 'USER_ROLE_ADD'
              : 'USER_ROLE_REPLACE',
          resourceType: 'User',
          resourceId: userId,
          oldValues: {
            roles: previousRoleCodes,
          },
          newValues: {
            roles:
              mode === RoleAssignmentMode.ADD
                ? [...new Set([...previousRoleCodes, role.code])]
                : [role.code],
            assignedBy: actorUserId,
            targetUsername: target.username,
          },
          success: true,
        },
      });

      return {
        message:
          mode === RoleAssignmentMode.ADD
            ? 'Additional role assigned successfully'
            : 'Previous roles revoked and new role assigned successfully',
        userId,
        roleCode: role.code,
        previousRoles: previousRoleCodes,
      };
    });
  }
}
