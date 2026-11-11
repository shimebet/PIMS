import { Module } from '@nestjs/common';
import { ObservationsService } from './observations.service.js';

@Module({
  providers: [ObservationsService]
})
export class ObservationsModule {}
