
import { Injectable } from '@nestjs/common';

import {
  ETHIOPIAN_REGIONS,
  ZONES_BY_REGION,
  WOREDAS_BY_ZONE,
  type GeographicOption,
  getGeographicZones,
  getGeographicWoredas,
} from './geographic-reference.data.js';

@Injectable()
export class GeographicReferenceService {
  getRegions(): GeographicOption[] {
    return ETHIOPIAN_REGIONS;
  }

  getZones(region: string): GeographicOption[] {
    return getGeographicZones(region);
  }

  getWoredas(
    region: string,
    zone: string,
  ): GeographicOption[] {
    return getGeographicWoredas(region, zone);
  }

  isKnownRegion(region: string): boolean {
    return ETHIOPIAN_REGIONS.some(
      (item) =>
        item.value.toLowerCase() ===
        region.trim().toLowerCase(),
    );
  }

  isKnownZone(
    region: string,
    zone: string,
  ): boolean {
    return this.getZones(region).some(
      (item) =>
        item.value.toLowerCase() ===
        zone.trim().toLowerCase(),
    );
  }

  isKnownWoreda(
    region: string,
    zone: string,
    woreda: string,
  ): boolean {
    return this.getWoredas(region, zone).some(
      (item) =>
        item.value.toLowerCase() ===
        woreda.trim().toLowerCase(),
    );
  }

  getReferenceSummary() {
    return {
      regionCount: ETHIOPIAN_REGIONS.length,
      configuredRegionsWithZones:
        Object.keys(ZONES_BY_REGION).length,
      configuredZonesWithWoredas:
        Object.keys(WOREDAS_BY_ZONE).length,
      isCompleteNationalDataset: false,
      customLocationsAllowed: true,
    };
  }
}
