
import type { ReportsService } from '../reports.service.js';

type HealthReport = Awaited<
  ReturnType<ReportsService['getHealthReport']>
>;

type CsvValue = string | number | null | undefined;

type IndicatorRow = {
  code: string;
  label: string;
  value: number;
};

/* ============================================
   CSV SAFETY AND FORMATTING
============================================ */

function escapeCsv(value: CsvValue): string {
  const text = String(value ?? '');

  // Prevent spreadsheet formula injection.
  const safeText = /^[\s]*[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

function createCsvRow(values: CsvValue[]): string {
  return values.map(escapeCsv).join(',');
}

function displayValue(
  value: string | null | undefined,
  fallback = 'Not specified',
): string {
  return value ?? fallback;
}

/* ============================================
   HEALTH OFFICE CSV GENERATOR
============================================ */

export function generateHealthReportCsv(
  report: HealthReport,
): string {
  const facility = report.facility;
  const period = report.reportingPeriod;
  const indicators = report.indicators;

  /* ==========================================
     FACILITY AND REPORT METADATA
  ========================================== */

  const metadata: Array<[string, string]> = [
    ['Facility Name', facility.name],
    ['Facility Code', facility.code],
    [
      'Facility Type',
      displayValue(facility.facilityType),
    ],
    [
      'Woreda / Address',
      displayValue(facility.address),
    ],
    [
      'City / Locality',
      displayValue(facility.city),
    ],
    [
      'Region',
      displayValue(facility.region),
    ],
    [
      'Country',
      displayValue(facility.country, 'Ethiopia'),
    ],
    ['Reporting Period', period.label],
    ['Period Type', period.period],
    ['Timezone', period.timezone],
    ['Calendar', period.calendar],
    ['Generated At (UTC)', report.generatedAt],
  ];

  /* ==========================================
     PERFORMANCE INDICATORS
     SAME LABELS AND VALUES AS PDF
  ========================================== */

  const rows: IndicatorRow[] = [
    {
      code: 'NEW_PATIENTS',
      label: 'New Patient Registrations',
      value: indicators.patientRegistration.newPatients,
    },
    {
      code: 'TOTAL_ENCOUNTERS',
      label: 'Total Consultations',
      value: indicators.consultations.totalEncounters,
    },
    {
      code: 'COMPLETED_ENCOUNTERS',
      label: 'Completed Consultations',
      value: indicators.consultations.completedEncounters,
    },
    {
      code: 'IN_PROGRESS_ENCOUNTERS',
      label: 'Consultations In Progress',
      value: indicators.consultations.inProgressEncounters,
    },
    {
      code: 'CANCELLED_ENCOUNTERS',
      label: 'Cancelled Consultations',
      value: indicators.consultations.cancelledEncounters,
    },
    {
      code: 'UNIQUE_PATIENTS_SERVED',
      label: 'Unique Patients Served',
      value: indicators.consultations.uniquePatientsServed,
    },
    {
      code: 'RECORDED_DIAGNOSES',
      label: 'Recorded Diagnoses',
      value: indicators.diagnoses.recordedDiagnoses,
    },
    {
      code: 'LAB_ORDERS',
      label: 'Laboratory Orders',
      value: indicators.laboratory.ordersPlaced,
    },
    {
      code: 'LAB_RESULTS',
      label: 'Laboratory Results',
      value: indicators.laboratory.resultsRecorded,
    },
    {
      code: 'RADIOLOGY_ORDERS',
      label: 'Radiology Orders',
      value: indicators.radiology.ordersPlaced,
    },
    {
      code: 'RADIOLOGY_RESULTS',
      label: 'Radiology Results',
      value: indicators.radiology.resultsRecorded,
    },
  ];

  /* ==========================================
     CSV DOCUMENT
  ========================================== */

  const csvLines: string[] = [];

  csvLines.push(
    createCsvRow([
      'OROMIA - HEALTH OFFICE REPORTING',
    ]),
  );

  csvLines.push(createCsvRow([facility.name]));

  csvLines.push(
    createCsvRow([
      'HEALTH OFFICE SERVICE PERFORMANCE REPORT',
    ]),
  );

  csvLines.push('');

  csvLines.push(
    createCsvRow(['Report Type', report.reportType]),
  );

  csvLines.push('');

  /* ==========================================
     FACILITY INFORMATION
  ========================================== */

  csvLines.push(
    createCsvRow(['FACILITY AND REPORT INFORMATION']),
  );

  csvLines.push(
    createCsvRow(['Field', 'Value']),
  );

  for (const [label, value] of metadata) {
    csvLines.push(createCsvRow([label, value]));
  }

  // Additional machine-readable date boundaries.
  csvLines.push(
    createCsvRow(['Start Date', period.startDate]),
  );

  csvLines.push(
    createCsvRow([
      'End Date Exclusive',
      period.endDateExclusive,
    ]),
  );

  csvLines.push('');

  /* ==========================================
     PERFORMANCE INDICATORS
  ========================================== */

  csvLines.push(
    createCsvRow(['PERFORMANCE INDICATORS']),
  );

  csvLines.push(
    createCsvRow([
      'Indicator Code',
      'Indicator',
      'Value',
    ]),
  );

  for (const row of rows) {
    csvLines.push(
      createCsvRow([
        row.code,
        row.label,
        row.value,
      ]),
    );
  }

  csvLines.push('');

  /* ==========================================
     REPORTING NOTES
  ========================================== */

  csvLines.push(
    createCsvRow(['REPORTING NOTES']),
  );

  csvLines.push(
    createCsvRow(['No.', 'Note']),
  );

  report.notes.forEach((note, index) => {
    csvLines.push(
      createCsvRow([index + 1, note]),
    );
  });

  csvLines.push('');

  /* ==========================================
     APPROVAL INFORMATION
  ========================================== */

  csvLines.push(
    createCsvRow(['APPROVAL INFORMATION']),
  );

  csvLines.push(
    createCsvRow([
      'Field',
      'Prepared By',
      'Approved By',
    ]),
  );

  csvLines.push(
    createCsvRow(['Name', '', '']),
  );

  csvLines.push(
    createCsvRow(['Signature', '', '']),
  );

  csvLines.push(
    createCsvRow(['Date', '', '']),
  );

  csvLines.push(
    createCsvRow([
      'Official Stamp',
      'Reserved for Authorized Official Stamp',
    ]),
  );

  /* ==========================================
     UTF-8 CSV OUTPUT
  ========================================== */

  return (
    '\uFEFF' +
    csvLines.join('\r\n') +
    '\r\n'
  );
}
