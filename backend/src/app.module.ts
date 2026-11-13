import { AppointmentsModule } from './modules/appointments/appointments.module.js';

import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './database/prisma/prisma.module.js';

import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';

import { EncountersModule } from './modules/encounters/encounters.module.js';
import { ObservationsModule } from './modules/observations/observations.module.js';
import { DiagnosesModule } from './modules/diagnoses/diagnoses.module.js';
import { AllergiesModule } from './modules/allergies/allergies.module.js';
import { ClinicalNotesModule } from './modules/clinical-notes/clinical-notes.module.js';
import { MedicationsModule } from './modules/medications/medications.module.js';
import { LaboratoryModule } from './modules/laboratory/laboratory.module.js';
import { RadiologyModule } from './modules/radiology/radiology.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';

import { GeographicReferenceModule } from './modules/geographic-reference/geographic-reference.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuditModule,
    AuthModule,
    UsersModule,
    PatientsModule,

    GeographicReferenceModule,

    EncountersModule,
    ObservationsModule,
    DiagnosesModule,
    AllergiesModule,
    ClinicalNotesModule,
    MedicationsModule,
    LaboratoryModule,
    RadiologyModule,
    ReportsModule,
    AppointmentsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(
    consumer: MiddlewareConsumer,
  ) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}

