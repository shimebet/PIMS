import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly jwtService:
      JwtService,

    private readonly configService:
      ConfigService,
  ) {}

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new UnauthorizedException(
        'Password confirmation does not match',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    const currentPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException(
        'Current password is incorrect',
      );
    }

    const passwordReused = await argon2.verify(
      user.passwordHash,
      dto.newPassword,
    );

    if (passwordReused) {
      throw new ConflictException(
        'New password must differ from current password',
      );
    }

    const newPasswordHash = await argon2.hash(
      dto.newPassword,
    );

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          status: 'ACTIVE',
          passwordHash: user.passwordHash,
        },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Password was changed concurrently. Please retry.',
        );
      }

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
          userId,
          eventType: 'SECURITY',
          action: 'USER_PASSWORD_CHANGE',
          resourceType: 'User',
          resourceId: userId,
          success: true,
        },
      });
    });

    return {
      message: 'Password changed successfully. Please sign in again.',
    };
  }
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        facilityId: true,
        departmentId: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            status: true,
            username: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            facilityId: true,
            departmentId: true,
          },
        });

        if (!existing || existing.status !== 'ACTIVE') {
          throw new UnauthorizedException('User is not active');
        }

        const fields = [
          'firstName',
          'middleName',
          'lastName',
          'email',
          'phone',
        ] as const;

        const data: {
          firstName?: string;
          middleName?: string | null;
          lastName?: string;
          email?: string | null;
          phone?: string | null;
        } = {};

        const changedFields: string[] = [];

        for (const field of fields) {
          const submitted = dto[field];

          if (submitted === undefined) {
            continue;
          }

          const normalized =
            (field === 'middleName' ||
              field === 'email' ||
              field === 'phone') &&
            submitted === ''
              ? null
              : submitted;

          if (normalized === existing[field]) {
            continue;
          }

          if (field === 'firstName') {
            data.firstName = submitted;
          } else if (field === 'lastName') {
            data.lastName = submitted;
          } else if (field === 'middleName') {
            data.middleName = normalized;
          } else if (field === 'email') {
            data.email = normalized;
          } else {
            data.phone = normalized;
          }

          changedFields.push(field);
        }

        if (changedFields.length === 0) {
          return existing;
        }

        if (data.email !== undefined && data.email !== null) {
          const duplicate = await tx.user.findFirst({
            where: {
              email: data.email,
              NOT: { id: userId },
            },
            select: { id: true },
          });

          if (duplicate) {
            throw new ConflictException('Email already exists');
          }
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data,
          select: {
            id: true,
            username: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            facilityId: true,
            departmentId: true,
            status: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            eventType: 'SECURITY',
            action: 'USER_PROFILE_UPDATE',
            resourceType: 'User',
            resourceId: userId,
            newValues: { changedFields },
            success: true,
          },
        });

        return updated;
      });
    } catch (error: unknown) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }
  async login(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          username,
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

    if (!user) {
      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Account is not active',
      );
    }

    if (
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {
      throw new UnauthorizedException(
        'Account is temporarily locked',
      );
    }

    const passwordValid =
      await argon2.verify(
        user.passwordHash,
        password,
      );

    if (!passwordValid) {
      await this.handleFailedLogin(
        user.id,
        user.failedLoginAttempts,
      );

      throw new UnauthorizedException(
        'Invalid username or password',
      );
    }

    const roles =
      user.roles.map(
        (userRole) =>
          userRole.role.code,
      );

    const permissions = [
      ...new Set(
        user.roles.flatMap(
          (userRole) =>
            userRole.role.permissions.map(
              (rolePermission) =>
                rolePermission
                  .permission
                  .code,
            ),
        ),
      ),
    ];

    const sessionId = randomUUID();

    const payload = {
      sid: sessionId,
      sub: user.id,
      username: user.username,
      facilityId: user.facilityId,
      roles,
      permissions,
    };

    const accessSecret =
      this.configService.get<string>(
        'JWT_ACCESS_SECRET',
      );

    const refreshSecret =
      this.configService.get<string>(
        'JWT_REFRESH_SECRET',
      );

    if (
      !accessSecret ||
      !refreshSecret
    ) {
      throw new Error(
        'JWT secrets are not configured',
      );
    }

    const accessExpires =
      Number(
        this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) ?? 900,
      );

    const refreshExpires =
      Number(
        this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) ?? 604800,
      );

    const accessToken =
      await this.jwtService.signAsync(
        payload,
        {
          secret: accessSecret,
          expiresIn: accessExpires,
        },
      );



    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
        sid: sessionId,
        jti: randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpires,
      },
    );

    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(
          Date.now() + refreshExpires * 1000,
        ),
      },
    });
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpires,

      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        facilityId: user.facilityId,
        departmentId:
          user.departmentId,
        roles,
        permissions,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private async handleFailedLogin(
    userId: string,
    currentAttempts: number,
  ) {
    const attempts =
      currentAttempts + 1;

    const shouldLock =
      attempts >= 5;

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        failedLoginAttempts:
          attempts,

        lockedUntil:
          shouldLock
            ? new Date(
                Date.now() +
                  15 * 60 * 1000,
              )
            : null,
      },
    });
  }

  async refresh(refreshToken: string) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');

    if (!refreshSecret || !accessSecret) {
      throw new Error('JWT secrets are not configured');
    }

    let payload: {
      sub: string;
      type: string;
      sid: string;
      jti: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      !payload ||
      payload.type !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.jti !== 'string' ||
      !payload.sub ||
      !payload.sid ||
      !payload.jti
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    const matches = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );

    if (!matches) {
      throw new UnauthorizedException('Refresh token is not valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const roles = user.roles.map(
      (userRole) => userRole.role.code,
    );

    const permissions = [
      ...new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    ];

    const accessExpires = Number(
      this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) ?? 900,
    );

    const refreshExpires = Number(
      this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) ?? 604800,
    );

    const now = new Date();

    const remainingSeconds = Math.floor(
      (session.expiresAt.getTime() - now.getTime()) / 1000,
    );

    if (remainingSeconds <= 0) {
      throw new UnauthorizedException('Refresh session has expired');
    }

    const nextRefreshExpires = Math.min(
      refreshExpires,
      remainingSeconds,
    );

    const nextRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
        sid: session.id,
        jti: randomUUID(),
      },
      {
        secret: refreshSecret,
        expiresIn: nextRefreshExpires,
      },
    );

    const nextRefreshTokenHash = await argon2.hash(
      nextRefreshToken,
    );

    const rotated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        userId: user.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException(
        'Refresh token has already been used or revoked',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sid: session.id,
        sub: user.id,
        username: user.username,
        facilityId: user.facilityId,
        roles,
        permissions,
      },
      {
        secret: accessSecret,
        expiresIn: accessExpires,
      },
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: accessExpires,
    };
  }
  async logout(
    userId: string,
  ) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message:
        'Logged out successfully',
    };
  }
}

