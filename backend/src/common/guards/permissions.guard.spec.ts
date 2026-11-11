import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  const createContext = (
    user?: {
      permissions: string[];
    },
  ) =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const createGuard = (required: string[]) => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(required),
    } as unknown as Reflector;

    return new PermissionsGuard(reflector);
  };

  it('allows routes without required permissions', () => {
    const guard = createGuard([]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows users with all required permissions', () => {
    const guard = createGuard(['patients.read', 'patients.write']);

    const context = createContext({
      permissions: ['patients.read', 'patients.write'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects users missing required permissions', () => {
    const guard = createGuard(['patients.write']);

    const context = createContext({
      permissions: ['patients.read'],
    });

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects requests without a user when permissions are required', () => {
    const guard = createGuard(['patients.read']);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});
