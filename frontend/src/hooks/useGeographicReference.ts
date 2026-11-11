
import { useEffect, useState } from 'react';

import {
  geographicReferenceApi,
} from '../api/geographic-reference.api';

import type {
  GeographicOption,
} from '../api/geographic-reference.api';

import {
  REGION_OPTIONS,
  getZones as getLocalZones,
  getWoredas as getLocalWoredas,
} from '../data/patient-registration-options';

interface GeographicReferenceState {
  regions: GeographicOption[];
  zonesByRegion: Record<string, GeographicOption[]>;
  woredasByKey: Record<string, GeographicOption[]>;
  loading: boolean;
  error: string | null;
}

const makeWoredaKey = (
  region: string,
  zone: string,
): string => JSON.stringify([region, zone]);

export function useGeographicReference(
  open: boolean,
  addresses: Array<{
    region: string;
    zone: string;
  }>,
) {
  const [state, setState] =
    useState<GeographicReferenceState>({
      regions: REGION_OPTIONS,
      zonesByRegion: {},
      woredasByKey: {},
      loading: false,
      error: null,
    });

  const regionKey = JSON.stringify(
    [...new Set(
      addresses
        .map((address) => address.region.trim())
        .filter(Boolean),
    )].sort(),
  );

  const woredaKey = JSON.stringify(
    [...new Set(
      addresses
        .filter(
          (address) =>
            address.region.trim() &&
            address.zone.trim(),
        )
        .map((address) =>
          makeWoredaKey(
            address.region.trim(),
            address.zone.trim(),
          ),
        ),
    )].sort(),
  );

  useEffect(() => {
    if (!open) return;

    let active = true;

    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }));

    geographicReferenceApi
      .getRegions()
      .then((regions) => {
        if (!active) return;

        setState((previous) => ({
          ...previous,
          regions,
          loading: false,
        }));
      })
      .catch(() => {
        if (!active) return;

        setState((previous) => ({
          ...previous,
          regions: REGION_OPTIONS,
          loading: false,
          error:
            'Geographic API unavailable. Using local reference data.',
        }));
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const regions: string[] =
      JSON.parse(regionKey);

    let active = true;

    for (const region of regions) {
      geographicReferenceApi
        .getZones(region)
        .then((zones) => {
          if (!active) return;

          setState((previous) => ({
            ...previous,
            zonesByRegion: {
              ...previous.zonesByRegion,
              [region]: zones,
            },
          }));
        })
        .catch(() => {
          if (!active) return;

          setState((previous) => ({
            ...previous,
            zonesByRegion: {
              ...previous.zonesByRegion,
              [region]: getLocalZones(region),
            },
          }));
        });
    }

    return () => {
      active = false;
    };
  }, [open, regionKey]);

  useEffect(() => {
    if (!open) return;

    const keys: string[] =
      JSON.parse(woredaKey);

    let active = true;

    for (const key of keys) {
      const [region, zone]: [string, string] =
        JSON.parse(key);

      geographicReferenceApi
        .getWoredas(region, zone)
        .then((woredas) => {
          if (!active) return;

          setState((previous) => ({
            ...previous,
            woredasByKey: {
              ...previous.woredasByKey,
              [key]: woredas,
            },
          }));
        })
        .catch(() => {
          if (!active) return;

          setState((previous) => ({
            ...previous,
            woredasByKey: {
              ...previous.woredasByKey,
              [key]: getLocalWoredas(zone, region),
            },
          }));
        });
    }

    return () => {
      active = false;
    };
  }, [open, woredaKey]);

  const getZones = (
    region: string,
  ): GeographicOption[] =>
    state.zonesByRegion[region] ??
    getLocalZones(region);

  const getWoredas = (
    region: string,
    zone: string,
  ): GeographicOption[] =>
    state.woredasByKey[
      makeWoredaKey(region, zone)
    ] ?? getLocalWoredas(zone, region);

  return {
    regions: state.regions,
    getZones,
    getWoredas,
    loading: state.loading,
    error: state.error,
  };
}
