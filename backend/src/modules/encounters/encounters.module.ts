import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { EncountersController } from './encounters.controller.js';
import { EncountersService } from './encounters.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    EncountersController,
  ],

  providers: [
    EncountersService,
  ],

  exports: [
    EncountersService,
  ],
})
export class EncountersModule {}