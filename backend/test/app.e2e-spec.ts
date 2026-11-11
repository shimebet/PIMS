
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        controllers: [AppController],
        providers: [AppService],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1 returns API status', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('PIMS Backend API is running');
  });
});
