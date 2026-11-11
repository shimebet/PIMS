import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { JwtUser } from '../types/jwt-user.type.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user =
      request.user as JwtUser;

    if (!user) {
      throw new ForbiddenException(
        'User information is unavailable',
      );
    }

    const allowed =
      requiredPermissions.every(
        (permission) =>
          user.permissions.includes(permission),
      );

    if (!allowed) {
      throw new ForbiddenException(
        'Permission denied',
      );
    }

    return true;
  }
}