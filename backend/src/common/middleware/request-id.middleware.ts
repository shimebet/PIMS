import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';

import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  randomUUID,
} from 'node:crypto';

@Injectable()
export class RequestIdMiddleware
  implements NestMiddleware
{
  use(
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    const existingRequestId =
      request.headers[
        'x-request-id'
      ];

    const requestId =
      typeof existingRequestId ===
      'string'
        ? existingRequestId
        : randomUUID();

    request.headers[
      'x-request-id'
    ] = requestId;

    response.setHeader(
      'X-Request-ID',
      requestId,
    );

    next();
  }
}