import {
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import type { JwtUser } from '../types/jwt-user.type.js';

type AuthenticatedRequest = Request & {
  user?: JwtUser;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const authenticated = await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      return false;
    }

    if (!user.mustChangePassword) {
      return true;
    }

    const allowedRoutes = new Set([
      'changePassword',
      'logout',
      'me',
    ]);

    const handlerName = context.getHandler().name;
    const controllerName = context.getClass().name;

    if (
      controllerName === 'AuthController' &&
      allowedRoutes.has(handlerName)
    ) {
      return true;
    }

    throw new ForbiddenException(
      'Password change required before accessing this resource',
    );
  }
}
