import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { ClinicalNotesController } from './clinical-notes.controller.js';
import { ClinicalNotesService } from './clinical-notes.service.js';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    ClinicalNotesController,
  ],

  providers: [
    ClinicalNotesService,
  ],

  exports: [
    ClinicalNotesService,
  ],
})
export class ClinicalNotesModule {}