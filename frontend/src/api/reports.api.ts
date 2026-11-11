
import { api } from './client';

/* ============================================
   REPORTING PERIODS
============================================ */

export type HealthReportPeriod =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY';

export interface HealthReportQuery {
  period: HealthReportPeriod;
  year: number;
  date?: string;
  month?: number;
  day?: number;
  week?: number;
  quarter?: number;
  halfYear?: number;

  // Optional report-only facility information.
  reportFacilityType?: string;
  reportRegion?: string;
  reportCity?: string;
  reportAddress?: string;
}

/* ============================================
   REPORT METADATA
============================================ */

export interface HealthReportFacility {
  id: string;
  code: string;
  name: string;
  facilityType: string | null;
  country?: string | null;
  region: string | null;
  city: string | null;
  address?: string | null;
}

export interface HealthReportDateRange {
  period: HealthReportPeriod;
  label: string;
  startDate: string;
  endDateExclusive: string;
  timezone: string;
  calendar: string;
}

/* ============================================
   REPORT INDICATORS
============================================ */

export interface PatientRegistrationIndicators {
  newPatients: number;
}

export interface ConsultationIndicators {
  totalEncounters: number;
  completedEncounters: number;
  inProgressEncounters: number;
  cancelledEncounters: number;
  uniquePatientsServed: number;
}

export interface DiagnosisIndicators {
  recordedDiagnoses: number;
}

export interface LaboratoryIndicators {
  ordersPlaced: number;
  resultsRecorded: number;
}

export interface RadiologyIndicators {
  ordersPlaced: number;
  resultsRecorded: number;
}

export interface HealthReportIndicators {
  patientRegistration: PatientRegistrationIndicators;
  consultations: ConsultationIndicators;
  diagnoses: DiagnosisIndicators;
  laboratory: LaboratoryIndicators;
  radiology: RadiologyIndicators;
}

/* ============================================
   COMPLETE HEALTH REPORT
============================================ */

export interface HealthReportResponse {
  reportType: 'HEALTH_OFFICE_REPORT';
  facility: HealthReportFacility;
  reportingPeriod: HealthReportDateRange;
  generatedAt: string;
  indicators: HealthReportIndicators;
  notes: string[];
}

/* ============================================
   FILE DOWNLOAD HELPERS
============================================ */

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'report'
  );
}

function buildFilename(
  format: 'pdf' | 'csv',
  params: HealthReportQuery,
): string {
  const period = sanitizeFilenamePart(
    params.period.toLowerCase(),
  );

  let periodValue = String(params.year);

  switch (params.period) {
    case 'DAILY':
      periodValue = params.date ?? String(params.year);
      break;

    case 'WEEKLY':
      periodValue =
        `${params.year}-week-${String(params.week ?? 1).padStart(2, '0')}`;
      break;

    case 'MONTHLY':
      periodValue =
        `${params.year}-${String(params.month ?? 1).padStart(2, '0')}`;
      break;

    case 'QUARTERLY':
      periodValue =
        `${params.year}-quarter-${params.quarter ?? 1}`;
      break;

    case 'HALF_YEARLY':
      periodValue =
        `${params.year}-half-${params.halfYear ?? 1}`;
      break;

    case 'YEARLY':
      break;
  }

  return `health-office-report-${period}-${sanitizeFilenamePart(periodValue)}.${format}`;
}

function saveBlob(
  data: Blob,
  filename: string,
): void {
  const objectUrl = URL.createObjectURL(data);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/* ============================================
   HEALTH OFFICE REPORTING API
============================================ */

export const reportsApi = {
  /**
   * GET /reports/health
   *
   * Generate a facility-scoped Health Office report.
   * Authentication and permissions are enforced
   * by the backend.
   */
  async getHealthReport(
    params: HealthReportQuery,
  ): Promise<HealthReportResponse> {
    const response = await api.get<HealthReportResponse>(
      '/reports/health',
      { params },
    );

    return response.data;
  },

  /**
   * GET /reports/health/export/pdf
   *
   * Requires report.export permission.
   */
  async downloadHealthReportPdf(
    params: HealthReportQuery,
  ): Promise<void> {
    const response = await api.get<Blob>(
      '/reports/health/export/pdf',
      {
        params,
        responseType: 'blob',
      },
    );

    const pdfBlob = new Blob(
      [response.data],
      { type: 'application/pdf' },
    );

    saveBlob(
      pdfBlob,
      buildFilename('pdf', params),
    );
  },

  /**
   * GET /reports/health/export/csv
   *
   * Requires report.export permission.
   */
  async downloadHealthReportCsv(
    params: HealthReportQuery,
  ): Promise<void> {
    const response = await api.get<Blob>(
      '/reports/health/export/csv',
      {
        params,
        responseType: 'blob',
      },
    );

    const csvBlob = new Blob(
      [response.data],
      { type: 'text/csv;charset=utf-8' },
    );

    saveBlob(
      csvBlob,
      buildFilename('csv', params),
    );
  },
};
