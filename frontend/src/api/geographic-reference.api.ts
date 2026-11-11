import { api } from './client';

/* ============================================
   GEOGRAPHIC REFERENCE TYPES
============================================ */

export interface GeographicOption {
  value: string;
  label: string;
}

export interface GeographicReferenceSummary {
  regionCount: number;
  configuredRegionsWithZones: number;
  configuredZonesWithWoredas: number;
  isCompleteNationalDataset: boolean;
  customLocationsAllowed: boolean;
}

/* ============================================
   GEOGRAPHIC REFERENCE API
============================================ */

export const geographicReferenceApi = {
  /**
   * GET /geographic-reference/regions
   */
  async getRegions(): Promise<GeographicOption[]> {
    const response = await api.get<GeographicOption[]>(
      '/geographic-reference/regions',
    );

    return response.data;
  },

  /**
   * GET /geographic-reference/zones
   */
  async getZones(
    region: string,
  ): Promise<GeographicOption[]> {
    if (!region.trim()) {
      return [];
    }

    const response = await api.get<GeographicOption[]>(
      '/geographic-reference/zones',
      {
        params: {
          region,
        },
      },
    );

    return response.data;
  },

  /**
   * GET /geographic-reference/woredas
   */
  async getWoredas(
    region: string,
    zone: string,
  ): Promise<GeographicOption[]> {
    if (!region.trim() || !zone.trim()) {
      return [];
    }

    const response = await api.get<GeographicOption[]>(
      '/geographic-reference/woredas',
      {
        params: {
          region,
          zone,
        },
      },
    );

    return response.data;
  },

  /**
   * GET /geographic-reference/summary
   */
  async getSummary(): Promise<GeographicReferenceSummary> {
    const response =
      await api.get<GeographicReferenceSummary>(
        '/geographic-reference/summary',
      );

    return response.data;
  },
};