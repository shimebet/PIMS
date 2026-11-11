import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('JwtStrategy', () => {
  const createConfig = (secret?: string) =>
    ({
      get: vi.fn().mockReturnValue(secret),
    }) as unknown as ConfigService;

  const createPrisma = (user: unknown) =>
    ({
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
      },
    }) as unknown as PrismaService;

  const payload = {
    sub: 'test-user-id',
    username: 'testuser',
    facilityId: 'test-facility-id',
    roles: ['DOCTOR'],
    permissions: ['patients.read'],
  };

  const activeUser = {
    id: 'test-user-id',
    username: 'testuser',
    facilityId: 'test-facility-id',
    status: 'ACTIVE',
    lockedUntil: null,
    roles: [
      {
        role: {
          code: 'DOCTOR',
          permissions: [
            {
              permission: {
                code: 'patients.read',
              },
            },
          ],
        },
      },
    ],
  };

  it('requires an access-token secret', () => {
    expect(
      () => new JwtStrategy(createConfig(), createPrisma(null)),
    ).toThrow('JWT_ACCESS_SECRET is not configured');
  });

  it('accepts active users and loads current permissions', async () => {
    const strategy = new JwtStrategy(
      createConfig('test-only-jwt-secret'),
      createPrisma(activeUser),
    );

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'test-user-id',
      username: 'testuser',
      facilityId: 'test-facility-id',
      roles: ['DOCTOR'],
      permissions: ['patients.read'],
    });
  });

  it('rejects users that no longer exist', async () => {
    const strategy = new JwtStrategy(
      createConfig('test-only-jwt-secret'),
      createPrisma(null),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects inactive users', async () => {
    const strategy = new JwtStrategy(
      createConfig('test-only-jwt-secret'),
      createPrisma({
        ...activeUser,
        status: 'INACTIVE',
      }),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects temporarily locked users', async () => {
    const strategy = new JwtStrategy(
      createConfig('test-only-jwt-secret'),
      createPrisma({
        ...activeUser,
        lockedUntil: new Date(Date.now() + 60000),
      }),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('uses database permissions instead of stale token claims', async () => {
    const strategy = new JwtStrategy(
      createConfig('test-only-jwt-secret'),
      createPrisma({
        ...activeUser,
        roles: [],
      }),
    );

    const result = await strategy.validate(payload);

    expect(result.roles).toEqual([]);
    expect(result.permissions).toEqual([]);
  });
});
