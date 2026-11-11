
/**
 * PIMS Geographic Reference Data
 *
 * Preliminary Ethiopian administrative
 * location reference information.
 *
 * This is not an authoritative national
 * administrative boundary dataset.
 *
 * Unlisted locations remain acceptable.
 */

export interface GeographicOption {
  value: string;
  label: string;
}

export const ETHIOPIAN_REGIONS: GeographicOption[] = [
  { value: 'Oromia', label: 'Oromia' },
  { value: 'Addis Ababa', label: 'Addis Ababa' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Amhara', label: 'Amhara' },
  {
    value: 'Benishangul-Gumuz',
    label: 'Benishangul-Gumuz',
  },
  {
    value: 'Central Ethiopia',
    label: 'Central Ethiopia',
  },
  { value: 'Dire Dawa', label: 'Dire Dawa' },
  { value: 'Gambela', label: 'Gambela' },
  { value: 'Harari', label: 'Harari' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Somali', label: 'Somali' },
  {
    value: 'South Ethiopia',
    label: 'South Ethiopia',
  },
  {
    value: 'South West Ethiopia Peoples',
    label: 'South West Ethiopia Peoples',
  },
  { value: 'Tigray', label: 'Tigray' },
];

export const ZONES_BY_REGION: Record<
  string,
  GeographicOption[]
> = {
  Oromia: [
    { value: 'Arsi', label: 'Arsi' },
    { value: 'West Arsi', label: 'West Arsi' },
    { value: 'Bale', label: 'Bale' },
    { value: 'East Bale', label: 'East Bale' },
  ],
};

export const WOREDAS_BY_ZONE: Record<
  string,
  GeographicOption[]
> = {
  Arsi: [
    { value: 'Tiyo', label: 'Tiyo' },
    { value: 'Dodota', label: 'Dodota' },
    { value: 'Hitosa', label: 'Hitosa' },
    { value: 'Munessa', label: 'Munessa' },
    { value: 'Robe', label: 'Robe' },
    { value: 'Digeluna Tijo', label: 'Digeluna Tijo' },
    { value: 'Lemu Bilbilo', label: 'Lemu Bilbilo' },
    { value: 'Sude', label: 'Sude' },
    { value: 'Amigna', label: 'Amigna' },
    { value: 'Seru', label: 'Seru' },
    { value: 'Gololcha', label: 'Gololcha' },
    { value: 'Chole', label: 'Chole' },
    { value: 'Merti', label: 'Merti' },
    { value: 'Aseko', label: 'Aseko' },
    { value: 'Jeju', label: 'Jeju' },
    { value: 'Diksis', label: 'Diksis' },
    { value: 'Sire', label: 'Sire' },
    { value: 'Bokoji', label: 'Bokoji' },
    { value: 'Shirka', label: 'Shirka' },
    { value: 'Tena', label: 'Tena' },
    { value: 'Ziway Dugda', label: 'Ziway Dugda' },
  ],

  'West Arsi': [
    { value: 'Siraro', label: 'Siraro' },
    { value: 'Shala', label: 'Shala' },
    { value: 'Arsi Negele', label: 'Arsi Negele' },
    { value: 'Kofele', label: 'Kofele' },
    { value: 'Kore', label: 'Kore' },
    { value: 'Gedeb Asasa', label: 'Gedeb Asasa' },
    { value: 'Dodola', label: 'Dodola' },
    { value: 'Kokosa', label: 'Kokosa' },
    { value: 'Nensebo', label: 'Nensebo' },
    { value: 'Adaba', label: 'Adaba' },
    {
      value: 'Shashemene Town',
      label: 'Shashemene Town',
    },
    {
      value: 'Shashemene Zuria',
      label: 'Shashemene Zuria',
    },
  ],

  Bale: [
    { value: 'Agarfa', label: 'Agarfa' },
    { value: 'Goba', label: 'Goba' },
    { value: 'Sinana', label: 'Sinana' },
    { value: 'Dinsho', label: 'Dinsho' },
    { value: 'Gasera', label: 'Gasera' },
    { value: 'Goro', label: 'Goro' },
    { value: 'Berbere', label: 'Berbere' },
    {
      value: 'Harena Buluk',
      label: 'Harena Buluk',
    },
    { value: 'Delo Mena', label: 'Delo Mena' },
  ],

  'East Bale': [
    { value: 'Ginir', label: 'Ginir' },
    { value: 'Rayitu', label: 'Rayitu' },
    { value: 'Sawena', label: 'Sawena' },
    { value: 'Lega Hida', label: 'Lega Hida' },
    { value: 'Golelcha', label: 'Golelcha' },
    {
      value: 'Dawe Kachen',
      label: 'Dawe Kachen',
    },
    { value: 'Dawe Serer', label: 'Dawe Serer' },
    { value: 'Ginir Town', label: 'Ginir Town' },
  ],
};

export function getGeographicZones(
  region: string,
): GeographicOption[] {
  return ZONES_BY_REGION[region] ?? [];
}

export function getGeographicWoredas(
  region: string,
  zone: string,
): GeographicOption[] {
  const validZone = getGeographicZones(region).some(
    (option) => option.value === zone,
  );

  if (!validZone) {
    return [];
  }

  return WOREDAS_BY_ZONE[zone] ?? [];
}
