import { useState } from 'react';
import ClinicalCharts from '../components/dashboard/ClinicalCharts';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScienceIcon from '@mui/icons-material/Science';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';

import { useAuth } from '../auth/AuthContext';

import {
  reportsApi,
  type HealthReportPeriod,
  type HealthReportQuery,
  type HealthReportResponse,
} from '../api/reports.api';

const PERIOD_OPTIONS: {

  value: HealthReportPeriod;
  label: string;
}[] = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'HALF_YEARLY', label: 'Half-yearly' },
    { value: 'YEARLY', label: 'Yearly' },
  ];
// Ethiopian regional states and the two chartered city administrations.
// This list is for administrative data entry, not a claim of HMIS certification.
const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'Southwest Ethiopia Peoples',
  'Tigray',
] as const;

const MAX_FACILITY_FIELD_LENGTH = 191;
const MAX_TYPE_LENGTH = 100;
const MAX_CITY_LENGTH = 150;
const MAX_ADDRESS_LENGTH = 250;

function normalizeRegion(value: string): string {
  const normalized = value.trim().toLowerCase();
  const alias = normalized === 'oromia region' || normalized === 'oromiya'
    ? 'Oromia'
    : normalized;
  return ETHIOPIAN_REGIONS.find(
    (item) => item.toLowerCase() === alias,
  ) ?? '';
}

const today = new Date(
  new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Addis_Ababa',
  }),
);

const initialYear = today.getFullYear();
const initialMonth = today.getMonth() + 1;
const initialDate = [
  initialYear,
  String(initialMonth).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-');

function getIsoWeek(date: Date): number {
  const value = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ),
  );

  const day = value.getUTCDay() || 7;

  value.setUTCDate(
    value.getUTCDate() + 4 - day,
  );

  const yearStart = new Date(
    Date.UTC(value.getUTCFullYear(), 0, 1),
  );

  return Math.ceil(
    ((value.getTime() - yearStart.getTime()) /
      86400000 +
      1) /
    7,
  );
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response;

    if (response?.status === 403) {
      return 'You do not have permission to view this report.';
    }

    if (response?.status === 401) {
      return 'Your session is unauthorized. Please sign in again.';
    }

    const message = response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to generate the report.';
}

interface FacilityDisplayFields {
  name: string;
  code: string;
  type: string;
  address: string;
  city: string;
  region: string;
}

const INITIAL_FACILITY: FacilityDisplayFields = {
  name: 'Wan Offi Medium Clinic',
  code: 'MAIN',
  type: 'Medium Clinic',
  address: 'Ghinnir Woreda, Delosebro',
  city: 'Delosebro',
  region: '',
};

function facilityFieldsFromReport(
  report: HealthReportResponse,
): FacilityDisplayFields {
  const facility = report.facility;

  return {
    name: facility.name,
    code: facility.code,
    type: facility.facilityType ?? '',
    address: facility.address ?? '',
    city: facility.city ?? '',
    region: normalizeRegion(facility.region ?? ''),
  };
}

interface IndicatorCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}

function IndicatorCard({
  title,
  value,
  icon,
  description,
}: IndicatorCardProps) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {title}
          </Typography>

          <Box sx={{ color: 'primary.main' }}>
            {icon}
          </Box>
        </Stack>

        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mt: 2 }}
        >
          {value.toLocaleString()}
        </Typography>

        {description && (
          <Typography
            variant="caption"
            color="text.secondary"
          >
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function HealthReportsPage() {
  const { user } = useAuth();

  const canReadReport =
    user?.permissions.includes('report.read') ?? false;
  const canExportReport =
    user?.permissions.includes('report.export') ?? false;

  const [exportingFormat, setExportingFormat] =
    useState<'pdf' | 'csv' | null>(null);

  const [exportError, setExportError] =
    useState<string | null>(null);

  const [generatedQuery, setGeneratedQuery] =
    useState<HealthReportQuery | null>(null);
  const [period, setPeriod] =
    useState<HealthReportPeriod>('MONTHLY');

  const [year, setYear] = useState(initialYear);
  const [date, setDate] = useState(initialDate);
  const [month, setMonth] = useState(initialMonth);
  const [week, setWeek] = useState(
    getIsoWeek(today),
  );

  const [quarter, setQuarter] = useState(
    Math.ceil(initialMonth / 3),
  );

  const [halfYear, setHalfYear] = useState(
    initialMonth <= 6 ? 1 : 2,
  );

  const [report, setReport] =
    useState<HealthReportResponse | null>(null);

  const [facilityFields, setFacilityFields] =
    useState<FacilityDisplayFields>(INITIAL_FACILITY);
  const [registeredFacility, setRegisteredFacility] =
    useState<FacilityDisplayFields | null>(null);
  const [facilityEdited, setFacilityEdited] = useState(false);
  const [showReportingGuidance, setShowReportingGuidance] = useState(true);

  function invalidateGeneratedReport() {
    setReport(null);
    setGeneratedQuery(null);
    setExportError(null);
    setError(null);
  }

  function updateFacilityField(
    field: keyof FacilityDisplayFields,
    value: string,
  ) {
    const maxLength = field === 'type'
      ? MAX_TYPE_LENGTH
      : field === 'city'
        ? MAX_CITY_LENGTH
        : field === 'address'
          ? MAX_ADDRESS_LENGTH
          : MAX_FACILITY_FIELD_LENGTH;

    setFacilityFields((current) => ({
      ...current,
      [field]: value.slice(0, maxLength),
    }));
    setFacilityEdited(true);
    invalidateGeneratedReport();
  }

  function resetFacilityFields() {
    setFacilityFields(registeredFacility ?? INITIAL_FACILITY);
    setFacilityEdited(false);
    invalidateGeneratedReport();
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  function buildQuery(): HealthReportQuery {
    const query: HealthReportQuery = { period, year };

    switch (period) {
      case 'DAILY':
        query.date = date;
        break;
      case 'WEEKLY':
        query.week = week;
        break;
      case 'MONTHLY':
        query.month = month;
        break;
      case 'QUARTERLY':
        query.quarter = quarter;
        break;
      case 'HALF_YEARLY':
        query.halfYear = halfYear;
        break;
      case 'YEARLY':
        break;
    }

    return query;
  }

  function buildFacilityQuery(
    base: HealthReportQuery,
    registered: FacilityDisplayFields,
  ): HealthReportQuery {
    const query = { ...base };
    const requestedType = facilityFields.type.trim();
    const requestedCity = facilityFields.city.trim();
    const requestedAddress = facilityFields.address.trim();
    const requestedRegion = facilityFields.region.trim();

    // Empty values are not overrides: the backend retains registered values.
    if (requestedType && requestedType !== registered.type) {
      query.reportFacilityType = requestedType;
    }
    if (requestedCity && requestedCity !== registered.city) {
      query.reportCity = requestedCity;
    }
    if (requestedAddress && requestedAddress !== registered.address) {
      query.reportAddress = requestedAddress;
    }
    if (requestedRegion && requestedRegion !== registered.region) {
      query.reportRegion = requestedRegion;
    }
    return query;
  }

  async function handleGenerateReport() {
    if (!canReadReport || loading || exportingFormat !== null) {
      return;
    }

    setLoading(true);
    setError(null);
    setExportError(null);
    setReport(null);
    setGeneratedQuery(null);

    try {
      const baseQuery = buildQuery();
      let registered = registeredFacility;
      let baseReport: HealthReportResponse | null = null;

      // Load trusted facility metadata before applying report-only overrides.
      if (!registered) {
        baseReport = await reportsApi.getHealthReport(baseQuery);
        registered = facilityFieldsFromReport(baseReport);
        setRegisteredFacility(registered);
        if (!facilityEdited) {
          setFacilityFields(registered);
        }
      }

      const query = facilityEdited
        ? buildFacilityQuery(baseQuery, registered)
        : baseQuery;

      const hasOverrides = Boolean(
        query.reportFacilityType || query.reportRegion ||
        query.reportCity || query.reportAddress,
      );

      const result = !hasOverrides && baseReport
        ? baseReport
        : await reportsApi.getHealthReport(query);

      setGeneratedQuery({ ...query });
      setReport(result);
      if (!facilityEdited) {
        setFacilityFields(facilityFieldsFromReport(result));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(
  format: 'pdf' | 'csv',
): Promise<void> {
  if (
    !canExportReport ||
    !generatedQuery ||
    !report ||
    exportingFormat
  ) {
    return;
  }

  setExportError(null);
  setExportingFormat(format);

  try {
    if (format === 'pdf') {
      await reportsApi.downloadHealthReportPdf(
        generatedQuery,
      );
    } else {
      await reportsApi.downloadHealthReportCsv(
        generatedQuery,
      );
    }
  } catch (err: unknown) {
    setExportError(getErrorMessage(err));
  } finally {
    setExportingFormat(null);
  }
}
  if (!canReadReport) {
    return (
      <Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 2 }}
        >
          Health Office Reporting
        </Typography>

        <Alert severity="warning">
          You do not have the report.read permission.
          Contact your system administrator.
        </Alert>
      </Box>
    );
  }

  const indicators = report?.indicators;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          mb: 1,
        }}
      >
        <AssessmentIcon
          color="primary"
          fontSize="large"
        />

        <Typography
          variant="h4"
          sx={{ fontWeight: 700 }}
        >
          Health Office Reporting
        </Typography>
      </Stack>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Generate facility-level health activity reports
        using recorded PIMS data.
      </Typography>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Facility Information
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={resetFacilityFields}
              disabled={loading || exportingFormat !== null}
            >
              Reset to Registered Information
            </Button>
          </Stack>

          <Alert severity="info" sx={{ mb: 2 }}>
            {registeredFacility
              ? 'Facility identity is verified against your account. Descriptive edits will be included in the next generated report and its PDF/CSV exports, and marked as unverified overrides.'
              : 'Initial details are placeholders. Generate a report to verify your assigned facility before relying on exported information.'}
          </Alert>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                label="Registered Facility"
                value={registeredFacility?.code ?? INITIAL_FACILITY.code}
                slotProps={{ select: { readOnly: true } }}
                helperText="Facility selection is restricted to the authenticated user's authorized facility."
              >
                <MenuItem value={registeredFacility?.code ?? INITIAL_FACILITY.code}>
                  {registeredFacility
                    ? `${registeredFacility.name} (${registeredFacility.code})`
                    : 'Wan Offi Medium Clinic (MAIN) - pending verification'}
                </MenuItem>
              </TextField>
            </Grid>
            {([
              ['name', 'Facility Name'],
              ['code', 'Facility Code'],
              ['type', 'Facility Type'],
              ['address', 'Woreda / Address'],
              ['city', 'City / Locality'],
            ] as const).map(([field, label]) => (
              <Grid key={field} size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={label}
                  value={facilityFields[field]}
                  onChange={(event) => updateFacilityField(field, event.target.value)}
                  disabled={loading || exportingFormat !== null || field === 'name' || field === 'code'}
                  slotProps={{ htmlInput: { maxLength: field === 'type' ? MAX_TYPE_LENGTH : field === 'city' ? MAX_CITY_LENGTH : field === 'address' ? MAX_ADDRESS_LENGTH : MAX_FACILITY_FIELD_LENGTH } }}
                  helperText={field === 'name' || field === 'code' ? 'Registered facility identity (read-only).' : 'Report-only descriptive information.'}
                />
              </Grid>
            ))}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Region / City Administration"
                value={facilityFields.region}
                onChange={(event) => updateFacilityField('region', event.target.value)}
                disabled={loading || exportingFormat !== null}
                helperText="Select an Ethiopian regional state or chartered city administration."
              >
                <MenuItem value=""><em>Not specified</em></MenuItem>
                {ETHIOPIAN_REGIONS.map((regionName) => (
                  <MenuItem key={regionName} value={regionName}>
                    {regionName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Facility name and code are read-only. Descriptive edits do not change the registered facility or patient-data scope. Generate a new report to apply edits to the screen, PDF and CSV; overrides are identified as unverified. Confirm details before official submission.
          </Alert>
          {facilityEdited && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Report-only edits are not saved to facility records. Regenerate after each change before exporting.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Reporting Quality and Standards
            </Typography>
            <Button size="small" onClick={() => setShowReportingGuidance((value) => !value)}>
              {showReportingGuidance ? 'Hide guidance' : 'Show guidance'}
            </Button>
          </Stack>
          {showReportingGuidance && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Alert severity="info">
                This is an operational facility activity report, not an officially
                approved Ethiopian HMIS/DHIS2 form. Official submission requires
                approved indicator definitions, facility identifiers, reporting
                calendars, and validation against the receiving health office template.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Data quality checks: verify reporting dates and time zone (Africa/Addis_Ababa),
                reconcile encounter counts, review missing registrations, and ensure
                no patient-identifying information is included in exported aggregates.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Governance: confirm the registered facility identity, use the authorized
                reporting scope, and obtain the required review, approval and official
                stamp through your clinic's established process.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Reporting Period
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Period"
                value={period}
                onChange={(event) => {
                  setPeriod(
                    event.target.value as HealthReportPeriod,
                  );
                  invalidateGeneratedReport();
                }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Year"
                value={year}
                onChange={(event) => {
                  setYear(Number(event.target.value));
                  invalidateGeneratedReport();
                }}
                slotProps={{
                  htmlInput: {
                    min: 2000,
                    max: 2100,
                  },
                }}
              />
            </Grid>

            {period === 'DAILY' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    const selectedYear = Number(
                      event.target.value.slice(0, 4),
                    );
                    if (selectedYear) {
                      setYear(selectedYear);
                    }
                    invalidateGeneratedReport();
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Grid>
            )}

            {period === 'WEEKLY' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="ISO Week"
                  value={week}
                  onChange={(event) => {
                    setWeek(Number(event.target.value));
                    invalidateGeneratedReport();
                  }}
                  slotProps={{
                    htmlInput: { min: 1, max: 53 },
                  }}
                />
              </Grid>
            )}

            {period === 'MONTHLY' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Month"
                  value={month}
                  onChange={(event) => {
                    setMonth(Number(event.target.value));
                    invalidateGeneratedReport();
                  }}
                >
                  {Array.from(
                    { length: 12 },
                    (_, index) => index + 1,
                  ).map((value) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      {new Date(
                        2026,
                        value - 1,
                        1,
                      ).toLocaleString('en-US', {
                        month: 'long',
                      })}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {period === 'QUARTERLY' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Quarter"
                  value={quarter}
                  onChange={(event) => {
                    setQuarter(Number(event.target.value));
                    invalidateGeneratedReport();
                  }}
                >
                  {[1, 2, 3, 4].map((value) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      Quarter {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {period === 'HALF_YEARLY' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Half-year"
                  value={halfYear}
                  onChange={(event) => {
                    setHalfYear(Number(event.target.value));
                    invalidateGeneratedReport();
                  }}
                >
                  <MenuItem value={1}>
                    January - June
                  </MenuItem>

                  <MenuItem value={2}>
                    July - December
                  </MenuItem>
                </TextField>
              </Grid>
            )}

            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={
                  loading ||
                  !Number.isInteger(year) ||
                  year < 2000 ||
                  year > 2100 ||
                  (period === 'DAILY' && !date) ||
                  (period === 'WEEKLY' &&
                    (week < 1 || week > 53))
                }
                onClick={() => {
                  void handleGenerateReport();
                }}
                startIcon={
                  loading ? (
                    <CircularProgress
                      size={18}
                      color="inherit"
                    />
                  ) : (
                    <AssessmentIcon />
                  )
                }
              >
                {loading
                  ? 'Generating...'
                  : 'Generate Report'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!report && !loading && !error && (
        <Alert severity="info">
          Select a reporting period and click
          Generate Report to view the statistics.
        </Alert>
      )}

      {report && indicators && (
        <>
        <Card sx={{ borderRadius: 3, mb: 3 }}>
  <CardContent sx={{ p: 3 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600 }}
        >
          Download Generated Report
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          Export the generated Health Office report
          as PDF or CSV.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={
            exportingFormat === 'pdf'
              ? <CircularProgress size={18} color="inherit" />
              : <PictureAsPdfIcon />
          }
          disabled={
            !canExportReport ||
            !generatedQuery ||
            exportingFormat !== null
          }
          onClick={() => {
            void handleDownload('pdf');
          }}
        >
          {exportingFormat === 'pdf'
            ? 'Downloading PDF...'
            : 'Download PDF'}
        </Button>

        <Button
          variant="outlined"
          color="success"
          startIcon={
            exportingFormat === 'csv'
              ? <CircularProgress size={18} />
              : <TableViewIcon />
          }
          disabled={
            !canExportReport ||
            !generatedQuery ||
            exportingFormat !== null
          }
          onClick={() => {
            void handleDownload('csv');
          }}
        >
          {exportingFormat === 'csv'
            ? 'Downloading CSV...'
            : 'Download CSV'}
        </Button>
      </Stack>
    </Stack>

    {!canExportReport && (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Your account requires the report.export permission
        to download reports.
      </Alert>
    )}

    {exportError && (
      <Alert severity="error" sx={{ mt: 2 }}>
        {exportError}
      </Alert>
    )}

    <Alert severity="info" sx={{ mt: 2 }}>
      PDF and CSV use the same reporting parameters and facility display information as the generated report. Report-only overrides are unverified and identified in report notes.
    </Alert>
  </CardContent>
</Card>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700 }}
              >
                {report.facility.name}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Code: {report.facility.code} | Type: {report.facility.facilityType || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Address: {report.facility.address || '-'} | City: {report.facility.city || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Region: {report.facility.region || 'Not specified'}
              </Typography>
              <Typography color="text.secondary">
                Reporting Period:{' '}
                {report.reportingPeriod.label}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Timezone:{' '}
                {report.reportingPeriod.timezone}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Generated:{' '}
                {new Date(
                  report.generatedAt,
                ).toLocaleString('en-ET', {
                  timeZone: 'Africa/Addis_Ababa',
                })}
              </Typography>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="New Patients"
                value={
                  indicators.patientRegistration.newPatients
                }
                icon={<PeopleIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Total Consultations"
                value={
                  indicators.consultations.totalEncounters
                }
                icon={<AssignmentIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Unique Patients Served"
                value={
                  indicators.consultations.uniquePatientsServed
                }
                icon={<PeopleIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Recorded Diagnoses"
                value={
                  indicators.diagnoses.recordedDiagnoses
                }
                icon={<MedicalInformationIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Laboratory Orders"
                value={indicators.laboratory.ordersPlaced}
                icon={<ScienceIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Laboratory Results"
                value={
                  indicators.laboratory.resultsRecorded
                }
                icon={<ScienceIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Radiology Orders"
                value={indicators.radiology.ordersPlaced}
                icon={<ImageSearchIcon />}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <IndicatorCard
                title="Radiology Results"
                value={
                  indicators.radiology.resultsRecorded
                }
                icon={<ImageSearchIcon />}
              />
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Consultation Status
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
              >
                <Typography>
                  Completed:{' '}
                  {indicators.consultations.completedEncounters}
                </Typography>

                <Typography>
                  In Progress:{' '}
                  {indicators.consultations.inProgressEncounters}
                </Typography>

                <Typography>
                  Cancelled:{' '}
                  {indicators.consultations.cancelledEncounters}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Report Notes
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1}>
                {report.notes.map((note, index) => (
                  <Typography
                    key={`${index}-${note}`}
                    variant="body2"
                    color="text.secondary"
                  >
                    {'\u2022'} {note}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3, mb: 3 }}>
            <ClinicalCharts indicators={indicators} />
          </Box>
        </>
      )}
    </Box>
  );
}
