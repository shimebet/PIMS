import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { JwtUser } from '../../../common/types/jwt-user.type.js';

interface JwtPayload {
  sub: string;
  sid: string;
  username: string;
  facilityId: string | null;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid access token');
    }

    if (
      typeof payload.sid !== 'string' ||
      !payload.sid
    ) {
      throw new UnauthorizedException('Invalid access session');
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
      throw new UnauthorizedException('Access session is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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

    return {
      userId: user.id,
      username: user.username,
      facilityId: user.facilityId,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
    };
  }
}

