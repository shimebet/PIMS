import { Module } from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  LaboratoryController,
} from './laboratory.controller.js';

import {
  LaboratoryService,
} from './laboratory.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    LaboratoryController,
  ],

  providers: [
    LaboratoryService,
  ],

  exports: [
    LaboratoryService,
  ],
})
export class LaboratoryModule {}