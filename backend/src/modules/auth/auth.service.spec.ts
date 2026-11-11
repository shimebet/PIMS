import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';

import { AuthService } from './auth.service.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';

describe('AuthService refresh-token security', () => {
  const refreshToken = 'test-refresh-token';

  const payload = {
    sub: 'user-1',
    type: 'refresh',
    sid: 'session-1',
    jti: 'token-1',
  };

  const activeUser = {
    id: 'user-1',
    username: 'testuser',
    facilityId: null,
    status: 'ACTIVE',
    lockedUntil: null,
    roles: [],
  };

  const activeSession = {
    id: 'session-1',
    userId: 'user-1',
    refreshTokenHash: '',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600000),
  };

  let prisma: any;
  let jwt: any;
  let config: any;
  let service: AuthService;

  beforeEach(async () => {
    const hash = await argon2.hash(refreshToken);

    prisma = {
      session: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    jwt = {
      verifyAsync: vi.fn().mockResolvedValue(payload),
      signAsync: vi.fn()
        .mockResolvedValueOnce('next-refresh-token')
        .mockResolvedValueOnce('next-access-token'),
    };

    config = {
      get: vi.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_ACCESS_EXPIRES_IN: '900',
          JWT_REFRESH_EXPIRES_IN: '604800',
        };

        return values[key];
      }),
    };

    prisma.session.findUnique.mockResolvedValue({
      ...activeSession,
      refreshTokenHash: hash,
    });

    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue(activeUser);

    service = new AuthService(
      prisma as PrismaService,
      jwt as JwtService,
      config as ConfigService,
    );
  });

  it('rotates a valid refresh token', async () => {
    const result = await service.refresh(refreshToken);

    expect(result.accessToken).toBe('next-access-token');
    expect(result.refreshToken).toBe('next-refresh-token');
    expect(prisma.session.updateMany).toHaveBeenCalledOnce();

    const update = prisma.session.updateMany.mock.calls[0][0];

    expect(update.where.id).toBe('session-1');
    expect(update.where.userId).toBe('user-1');
    expect(update.where.revokedAt).toBeNull();
    expect(update.where.refreshTokenHash).toBeTruthy();
    expect(update.data.refreshTokenHash).toBeTruthy();
  });

  it('rejects an invalid refresh JWT', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('Invalid JWT'));

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token without a session ID', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired sessions', async () => {
    const session = await prisma.session.findUnique();

    prisma.session.findUnique.mockResolvedValue({
      ...session,
      expiresAt: new Date(Date.now() - 60000),
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects revoked sessions', async () => {
    const session = await prisma.session.findUnique();

    prisma.session.findUnique.mockResolvedValue({
      ...session,
      revokedAt: new Date(),
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      status: 'INACTIVE',
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects temporarily locked accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      lockedUntil: new Date(Date.now() + 60000),
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects rotation when another request already updated the session', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token belonging to another user', async () => {
    const session = await prisma.session.findUnique();

    prisma.session.findUnique.mockResolvedValue({
      ...session,
      userId: 'different-user',
    });

    await expect(
      service.refresh(refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });
});
