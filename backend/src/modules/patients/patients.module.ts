
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { GeographicReferenceModule } from '../geographic-reference/geographic-reference.module.js';

import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

import { PatientsImportController } from './import/patients-import.controller.js';
import { PatientsImportService } from './import/patients-import.service.js';

@Module({
  imports: [
    AuthModule,
    GeographicReferenceModule,
  ],

  controllers: [
    PatientsImportController,
    PatientsController,
  ],

  providers: [
    PatientsService,
    PatientsImportService,
  ],

  exports: [
    PatientsService,
  ],
})
export class PatientsModule {}
