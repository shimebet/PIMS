
import { api } from './client';

import type {
  Patient,
  PatientListResponse,
  PatientSearchParams,
} from '../types/patient';

/* ============================================
   PATIENT REGISTRATION TYPES
============================================ */

export interface UpdatePatientRequest {
  phone?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  birthDateEstimated?: boolean;
  sexAtBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  preferredLanguage?: string;
  occupation?: string;
  status?: string;
}
export interface CreatePatientIdentifier {
  identifierType: string;
  identifierValue: string;
  issuingAuthority?: string;
  country?: string;
  isPrimary?: boolean;
}

export interface CreatePatientContact {
  contactType: string;
  contactValue: string;
  isPrimary?: boolean;
}

export interface CreatePatientAddress {
  country?: string;
  region?: string;
  zone?: string;
  district?: string;
  city?: string;
  subCity?: string;
  kebele?: string;
  street?: string;
  houseNumber?: string;
  isPrimary?: boolean;
}

export interface CreatePatientRequest {
  firstName: string;
  middleName?: string;
  lastName: string;

  dateOfBirth?: string;
  birthDateEstimated?: boolean;

  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;

  nationality?: string;
  preferredLanguage?: string;
  occupation?: string;

  registrationFacilityId: string;

  identifiers?: CreatePatientIdentifier[];
  contacts?: CreatePatientContact[];
  addresses?: CreatePatientAddress[];
}

/* ============================================
   DUPLICATE CHECK TYPES
============================================ */

export interface DuplicateCheckRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface PossibleDuplicatePatient {
  id?: string;
  patientNumber?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  dateOfBirth?: string | null;
  [key: string]: unknown;
}

export interface DuplicateCheckResponse {
  possibleDuplicates: PossibleDuplicatePatient[];
}

/* ============================================
   CSV IMPORT TYPES
============================================ */

export type PatientImportRowStatus =
  | 'VALID'
  | 'INVALID'
  | 'DUPLICATE';

export interface PatientImportRow {
  rowNumber: number;
  status: PatientImportRowStatus;
  errors: string[];
  warnings?: string[];
  patient: CreatePatientRequest | null;
}


export interface PatientImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: PatientImportRow[];
}

export interface ImportedPatientResult {
  rowNumber: number;
  patientId: string;
  patientNumber: string;
}

export interface FailedPatientImportRow {
  rowNumber: number;
  reason: string;
}

export interface PatientImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  imported: ImportedPatientResult[];
  failed: FailedPatientImportRow[];
}

/* ============================================
   CSV UPLOAD HELPER
============================================ */

function createCsvFormData(file: File): FormData {
  const formData = new FormData();

  formData.append('file', file);

  return formData;
}

/* ============================================
   PATIENT MANAGEMENT API
============================================ */

export const patientsApi = {
  /**
   * GET /patients
   *
   * Retrieve paginated patients.
   */
  async list(
    params: PatientSearchParams = {},
  ): Promise<PatientListResponse> {
    const response = await api.get<PatientListResponse>(
      '/patients',
      { params },
    );

    return response.data;
  },

  /**
   * GET /patients/:id
   *
   * Retrieve patient details.
   */
  async getById(id: string): Promise<Patient> {
    const response = await api.get<Patient>(
      `/patients/${encodeURIComponent(id)}`,
    );

    return response.data;
  },

  /**
   * POST /patients
   *
   * Register one patient manually.
   */
  async create(
    data: CreatePatientRequest,
  ): Promise<Patient> {
    const response = await api.post<Patient>(
      '/patients',
      data,
    );

    return response.data;
  },

  /**
   * POST /patients/duplicate-check
   *
   * Check possible existing patients.
   */
  async checkDuplicates(
    data: DuplicateCheckRequest,
  ): Promise<DuplicateCheckResponse> {
    const response =
      await api.post<DuplicateCheckResponse>(
        '/patients/duplicate-check',
        data,
      );

    return response.data;
  },

  /**
   * PATCH /patients/:id
   *
   * Update supported patient information.
   * Requires patient.update permission.
   */
  async update(
    id: string,
    data: UpdatePatientRequest,
  ): Promise<Patient> {
    const response = await api.patch<Patient>(
      `/patients/${encodeURIComponent(id)}`,
      data,
    );

    return response.data;
  },
  /**
   * PATCH /patients/:id/deactivate
   *
   * Deactivate an active patient without deleting history.
   * Requires patient.deactivate permission.
   */
  /**
   * PATCH /patients/:id/activate
   *
   * Reactivate an inactive patient.
   * Requires patient.update permission.
   */
  async activate(id: string): Promise<Patient> {
    const response = await api.patch<Patient>(
      `/patients/${encodeURIComponent(id)}/activate`,
    );

    return response.data;
  },
  /**
   * POST /patients/:id/soft-delete
   * Requires patient.delete permission.
   */
  async softDelete(
    id: string,
    reason: string,
    confirmation: string,
  ): Promise<unknown> {
    const response = await api.post(
      `/patients/${encodeURIComponent(id)}/soft-delete`,
      { reason, confirmation },
    );

    return response.data;
  },
  async deactivate(id: string): Promise<Patient> {
    const response = await api.patch<Patient>(
      `/patients/${encodeURIComponent(id)}/deactivate`,
    );

    return response.data;
  },
  /* ========================================
     OPTION 2: CSV BULK PATIENT REGISTRATION
  ======================================== */

  /**
   * GET /patients/import/template
   *
   * Download the official CSV template.
   */
  async downloadImportTemplate(): Promise<void> {
    const response = await api.get<Blob>(
      '/patients/import/template',
      {
        responseType: 'blob',
      },
    );

    const blob = new Blob(
      [response.data],
      {
        type: 'text/csv;charset=utf-8',
      },
    );

    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download =
      'pims-patient-import-template.csv';

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);

    window.URL.revokeObjectURL(url);
  },

  /**
   * POST /patients/import/preview
   *
   * Upload CSV and validate patient rows.
   *
   * This does not create patients.
   */
  async previewImport(
    file: File,
  ): Promise<PatientImportPreviewResponse> {
    const formData = createCsvFormData(file);

    const response =
      await api.post<PatientImportPreviewResponse>(
        '/patients/import/preview',
        formData,
      );

    return response.data;
  },

  /**
   * POST /patients/import
   *
   * Register patients from CSV.
   *
   * Backend performs duplicate checking
   * and creates patient records.
   */
  async importPatients(
    file: File,
  ): Promise<PatientImportResult> {
    const formData = createCsvFormData(file);

    const response =
      await api.post<PatientImportResult>(
        '/patients/import',
        formData,
      );

    return response.data;
  },
};
