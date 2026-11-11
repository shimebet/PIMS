import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import argon2 from 'argon2';

import { PrismaService } from '../../database/prisma/prisma.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing =
      await this.prisma.user.findUnique({
        where: {
          username: dto.username,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Username already exists',
      );
    }

    if (dto.email) {
      const emailExists =
        await this.prisma.user.findUnique({
          where: {
            email: dto.email,
          },
        });

      if (emailExists) {
        throw new ConflictException(
          'Email already exists',
        );
      }
    }

    const passwordHash =
      await argon2.hash(dto.password);

    return this.prisma.user.create({
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
  ) {
    await this.findOne(id);

    if (dto.email) {
      const emailExists =
        await this.prisma.user.findFirst({
          where: {
            email: dto.email,
            NOT: {
              id,
            },
          },
        });

      if (emailExists) {
        throw new ConflictException(
          'Email already exists',
        );
      }
    }

    return this.prisma.user.update({
      where: {
        id,
      },

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
  }

  async lock(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: {
        id,
      },

      data: {
        status: 'LOCKED',
        lockedUntil: null,
      },

      select: {
        id: true,
        username: true,
        status: true,
      },
    });
  }

  async unlock(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: {
        id,
      },

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
  }

  async assignRole(
    userId: string,
    roleCode: string,
  ) {
    await this.findOne(userId);

    const role =
      await this.prisma.role.findUnique({
        where: {
          code: roleCode,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },

      update: {},

      create: {
        userId,
        roleId: role.id,
      },
    });

    return {
      message: 'Role assigned successfully',
      userId,
      roleCode,
    };
  }
}