
import { api } from './client';

/* ============================================
   ENCOUNTER TYPES
============================================ */

export interface EncounterPatient {
  id: string;
  patientNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
}

export interface EncounterFacility {
  id: string;
  name: string;
}

export interface Encounter {
  id: string;
  encounterNumber: string;

  patientId: string;
  facilityId: string;
  practitionerId?: string | null;

  encounterType: string;
  status: string;

  reasonForVisit?: string | null;
  chiefComplaint?: string | null;

  startedAt: string;
  endedAt?: string | null;
  createdAt: string;
  updatedAt?: string;

  patient?: EncounterPatient;
  facility?: EncounterFacility;

  practitioner?: Record<string, unknown> | null;

  observations?: VitalSignObservation[];
  diagnoses?: EncounterDiagnosis[];
}

export interface EncounterSearchParams {
  page?: number;
  limit?: number;
  patientId?: string;
  practitionerId?: string;
  status?: string;
  encounterType?: string;
  fromDate?: string;
  toDate?: string;
}

export interface EncounterListResponse {
  items: Encounter[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* ============================================
   CREATE / CLOSE ENCOUNTER
============================================ */

export interface CreateEncounterRequest {
  patientId: string;
  facilityId: string;
  practitionerId?: string;

  encounterType: string;

  reasonForVisit?: string;
  chiefComplaint?: string;
  startedAt?: string;
}

export interface CloseEncounterRequest {
  endedAt?: string;
}

/* ============================================
   VITAL SIGNS
============================================ */

export interface CreateVitalsRequest {
  systolicBloodPressure?: number;
  diastolicBloodPressure?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface VitalSignObservation {
  id: string;
  patientId: string;
  encounterId: string;

  category: string;
  code: string;
  name: string;

  valueNumeric?: number | string | null;
  unit?: string | null;

  status?: string;
  observedAt: string;
}

/* ============================================
   DIAGNOSES
============================================ */

export interface CreateDiagnosisRequest {
  practitionerId?: string;
  code?: string;
  codeSystem?: string;
  description: string;
  diagnosisType?: string;
  onsetAt?: string;
}

export interface EncounterDiagnosis {
  id: string;
  patientId: string;
  encounterId: string;

  practitionerId?: string | null;
  code?: string | null;
  codeSystem?: string | null;

  description: string;
  diagnosisType?: string | null;
  status: string;

  onsetAt?: string | null;
  createdAt: string;
}

/* ============================================
   ENCOUNTERS API
============================================ */

export const encountersApi = {
  /**
   * GET /encounters
   * List encounters with pagination and filters.
   */
  async list(
    params: EncounterSearchParams = {},
  ): Promise<EncounterListResponse> {
    const response = await api.get<EncounterListResponse>(
      '/encounters',
      { params },
    );

    return response.data;
  },

  /**
   * GET /encounters/:id
   * Retrieve encounter details.
   */
  async getById(id: string): Promise<Encounter> {
    const response = await api.get<Encounter>(
      `/encounters/${encodeURIComponent(id)}`,
    );

    return response.data;
  },

  /**
   * POST /encounters
   * Open a new patient encounter.
   */
  async create(
    data: CreateEncounterRequest,
  ): Promise<Encounter> {
    const response = await api.post<Encounter>(
      '/encounters',
      data,
    );

    return response.data;
  },

  /**
   * PATCH /encounters/:id/close
   * Complete an encounter.
   */
  async close(
    id: string,
    data: CloseEncounterRequest = {},
  ): Promise<Encounter> {
    const response = await api.patch<Encounter>(
      `/encounters/${encodeURIComponent(id)}/close`,
      data,
    );

    return response.data;
  },

  /**
   * POST /encounters/:id/vitals
   * Record vital signs.
   */
  async createVitals(
    encounterId: string,
    data: CreateVitalsRequest,
  ): Promise<VitalSignObservation[]> {
    const response = await api.post<VitalSignObservation[]>(
      `/encounters/${encodeURIComponent(encounterId)}/vitals`,
      data,
    );

    return response.data;
  },

  /**
   * GET /encounters/:id/vitals
   * Retrieve vital signs.
   */
  async getVitals(
    encounterId: string,
  ): Promise<VitalSignObservation[]> {
    const response = await api.get<VitalSignObservation[]>(
      `/encounters/${encodeURIComponent(encounterId)}/vitals`,
    );

    return response.data;
  },

  /**
   * POST /encounters/:id/diagnoses
   * Record a diagnosis.
   */
  async createDiagnosis(
    encounterId: string,
    data: CreateDiagnosisRequest,
  ): Promise<EncounterDiagnosis> {
    const response = await api.post<EncounterDiagnosis>(
      `/encounters/${encodeURIComponent(encounterId)}/diagnoses`,
      data,
    );

    return response.data;
  },

  /**
   * GET /encounters/:id/diagnoses
   * Retrieve encounter diagnoses.
   */
  async getDiagnoses(
    encounterId: string,
  ): Promise<EncounterDiagnosis[]> {
    const response = await api.get<EncounterDiagnosis[]>(
      `/encounters/${encodeURIComponent(encounterId)}/diagnoses`,
    );

    return response.data;
  },
};
