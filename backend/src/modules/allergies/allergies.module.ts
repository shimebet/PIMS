import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { AllergiesController } from './allergies.controller.js';
import { AllergiesService } from './allergies.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    AllergiesController,
  ],

  providers: [
    AllergiesService,
  ],

  exports: [
    AllergiesService,
  ],
})
export class AllergiesModule {}