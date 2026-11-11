
/**
 * PIMS Patient Registration Reference Data
 *
 * Initial configuration for Ethiopia, with
 * emphasis on southeastern Oromia.
 *
 * IMPORTANT:
 * Geographic data is a preliminary subset.
 * Verify all administrative relationships
 * against current official records before
 * using them as an authoritative master list.
 */

export interface SelectOption {
  value: string;
  label: string;
}

/* ============================================
   PREFERRED LANGUAGES
============================================ */

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'Afaan Oromoo', label: 'Afaan Oromoo' },
  { value: 'Amharic', label: 'Amharic' },
  { value: 'English', label: 'English' },
  { value: 'Somali', label: 'Somali' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Tigrinya', label: 'Tigrinya' },
  { value: 'Wolaytta', label: 'Wolaytta' },
  { value: 'Gurage', label: 'Gurage' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Other', label: 'Other' },
];

/* ============================================
   OCCUPATIONS
============================================ */

export const OCCUPATION_OPTIONS: SelectOption[] = [
  { value: 'Farmer', label: 'Farmer' },
  { value: 'Pastoralist', label: 'Pastoralist' },
  { value: 'Agro-pastoralist', label: 'Agro-pastoralist' },
  { value: 'Merchant', label: 'Merchant / Trader' },
  { value: 'Student', label: 'Student' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Health Professional', label: 'Health Professional' },
  { value: 'Government Employee', label: 'Government Employee' },
  { value: 'Private Employee', label: 'Private Employee' },
  { value: 'Daily Laborer', label: 'Daily Laborer' },
  { value: 'Driver', label: 'Driver' },
  { value: 'Construction Worker', label: 'Construction Worker' },
  { value: 'Homemaker', label: 'Homemaker' },
  { value: 'Unemployed', label: 'Unemployed' },
  { value: 'Retired', label: 'Retired' },
  { value: 'Other', label: 'Other' },
];

/* ============================================
   IDENTIFIER TYPES
============================================ */

export const IDENTIFIER_TYPE_OPTIONS: SelectOption[] = [
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'FAYDA_ID', label: 'Fayda National ID' },

  { value: 'KEBELE_ID', label: 'Kebele / Resident ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'EMPLOYEE_ID', label: 'Employee ID' },
  { value: 'STUDENT_ID', label: 'Student ID' },
  { value: 'OTHER', label: 'Other Identifier' },
];

/* ============================================
   REGIONS
============================================ */

export const REGION_OPTIONS: SelectOption[] = [
  { value: 'Oromia', label: 'Oromia' },
  { value: 'Addis Ababa', label: 'Addis Ababa' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Amhara', label: 'Amhara' },
  { value: 'Benishangul-Gumuz', label: 'Benishangul-Gumuz' },
  { value: 'Central Ethiopia', label: 'Central Ethiopia' },
  { value: 'Dire Dawa', label: 'Dire Dawa' },
  { value: 'Gambela', label: 'Gambela' },
  { value: 'Harari', label: 'Harari' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Somali', label: 'Somali' },
  { value: 'South Ethiopia', label: 'South Ethiopia' },
  { value: 'South West Ethiopia Peoples', label: 'South West Ethiopia Peoples' },
  { value: 'Tigray', label: 'Tigray' },
];

/* ============================================
   INITIAL OROMIA ZONE OPTIONS
============================================ */

export const ZONES_BY_REGION: Record<string, SelectOption[]> = {
  Oromia: [
    { value: 'Arsi', label: 'Arsi' },
    { value: 'West Arsi', label: 'West Arsi' },
    { value: 'Bale', label: 'Bale' },
    { value: 'East Bale', label: 'East Bale' },
  ],
};

/* ============================================
   INITIAL WOREDA OPTIONS
============================================ */

export const WOREDAS_BY_ZONE: Record<string, SelectOption[]> = {

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
  { value: 'Shashemene Town', label: 'Shashemene Town' },
  { value: 'Shashemene Zuria', label: 'Shashemene Zuria' },
],



Bale: [
  { value: 'Agarfa', label: 'Agarfa' },
  { value: 'Goba', label: 'Goba' },
  { value: 'Sinana', label: 'Sinana' },
  { value: 'Dinsho', label: 'Dinsho' },
  { value: 'Gasera', label: 'Gasera' },
  { value: 'Goro', label: 'Goro' },
  { value: 'Berbere', label: 'Berbere' },
  { value: 'Harena Buluk', label: 'Harena Buluk' },
  { value: 'Delo Mena', label: 'Delo Mena' },
],


'East Bale': [
  { value: 'Ginir', label: 'Ginir' },
  { value: 'Rayitu', label: 'Rayitu' },
  { value: 'Sawena', label: 'Sawena' },
  { value: 'Lega Hida', label: 'Lega Hida' },
  { value: 'Golelcha', label: 'Golelcha' },
  { value: 'Dawe Kachen', label: 'Dawe Kachen' },
  { value: 'Dawe Serer', label: 'Dawe Serer' },
  { value: 'Ginir Town', label: 'Ginir Town' },
],

};

/* ============================================
   HELPER FUNCTIONS
============================================ */


/**
 * Return zones for a selected region.
 */
export function getZones(
  region: string,
): SelectOption[] {
  return ZONES_BY_REGION[region] ?? [];
}

/**
 * Return woredas for a selected zone.
 *
 * The optional region parameter allows
 * backward compatibility with existing
 * getWoredas(zone) calls.
 */
export function getWoredas(
  zone: string,
  region = 'Oromia',
): SelectOption[] {
  if (region !== 'Oromia') {
    return [];
  }

  const validZone = getZones(region).some(
    (option) => option.value === zone,
  );

  if (!validZone) {
    return [];
  }

  return WOREDAS_BY_ZONE[zone] ?? [];
}

/**
 * Check whether a woreda exists in the
 * configured geographic reference data.
 *
 * An unlisted woreda can still be entered
 * manually using Other / Not Listed.
 */
export function isKnownWoreda(
  region: string,
  zone: string,
  woreda: string,
): boolean {
  return getWoredas(zone, region).some(
    (option) => option.value === woreda,
  );
}

