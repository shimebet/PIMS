import { Module } from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  RadiologyController,
} from './radiology.controller.js';

import {
  RadiologyService,
} from './radiology.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    RadiologyController,
  ],

  providers: [
    RadiologyService,
  ],

  exports: [
    RadiologyService,
  ],
})
export class RadiologyModule {}