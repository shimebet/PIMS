
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

import { GeographicReferenceService } from './geographic-reference.service.js';

@Controller('geographic-reference')
@UseGuards(JwtAuthGuard)
export class GeographicReferenceController {
  constructor(
    private readonly geographicReferenceService:
      GeographicReferenceService,
  ) {}

  @Get('regions')
  getRegions() {
    return this.geographicReferenceService.getRegions();
  }

  @Get('zones')
  getZones(
    @Query('region') region?: string,
  ) {
    if (!region) {
      return [];
    }

    return this.geographicReferenceService.getZones(
      region,
    );
  }

  @Get('woredas')
  getWoredas(
    @Query('region') region?: string,
    @Query('zone') zone?: string,
  ) {
    if (!region || !zone) {
      return [];
    }

    return this.geographicReferenceService.getWoredas(
      region,
      zone,
    );
  }

  @Get('summary')
  getSummary() {
    return this.geographicReferenceService.getReferenceSummary();
  }
}
