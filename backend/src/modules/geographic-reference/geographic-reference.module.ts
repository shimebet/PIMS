
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { GeographicReferenceController } from './geographic-reference.controller.js';

import { GeographicReferenceService } from './geographic-reference.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    GeographicReferenceController,
  ],

  providers: [
    GeographicReferenceService,
  ],

  exports: [
    GeographicReferenceService,
  ],
})
export class GeographicReferenceModule {}
