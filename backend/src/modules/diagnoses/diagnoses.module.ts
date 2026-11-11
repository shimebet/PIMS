import { Module } from '@nestjs/common';
import { DiagnosesService } from './diagnoses.service.js';

@Module({
  providers: [DiagnosesService]
})
export class DiagnosesModule {}
