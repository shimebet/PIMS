import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import type { JwtUser } from '../types/jwt-user.type.js';

export const CurrentUser =
  createParamDecorator(
    (
      _data: unknown,
      context: ExecutionContext,
    ): JwtUser => {
      const request =
        context
          .switchToHttp()
          .getRequest();

      return request.user as JwtUser;
    },
  );