
import {
  ValidationPipe,
} from '@nestjs/common';

import {
  NestFactory,
} from '@nestjs/core';

import helmet from 'helmet';

import {
  AppModule,
} from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
  );

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Security headers
  app.use(helmet());

  // Allowed frontend origins
  const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];

  // Allow an additional configured frontend URL
  const frontendUrl = process.env.FRONTEND_URL;

  if (
    frontendUrl &&
    !allowedOrigins.includes(frontendUrl)
  ) {
    allowedOrigins.push(frontendUrl);
  }

  // CORS configuration
  app.enableCors({
    origin: allowedOrigins,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],

    credentials: true,

    optionsSuccessStatus: 204,
  });

  // Global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Backend port
  const port = Number(
    process.env.PORT ?? 3000,
  );

  // Start server
  await app.listen(port);

  console.log(
    `PIMS API running on http://localhost:${port}/api/v1`,
  );
}

await bootstrap();
