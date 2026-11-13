import { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAuth } from '../auth/AuthContext';

import {
  reportsApi,
  type AppointmentSummaryResponse,
} from '../api/reports.api';

const TIME_ZONE = 'Africa/Addis_Ababa';

function getEthiopiaDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function getMonthStart(): string {
  return `${getEthiopiaDate().slice(0, 7)}-01`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export default function AppointmentReportsPage() {
  const { user } = useAuth();

  const canReadReport =
    user?.permissions.includes('report.read') ?? false;

  const [dateFrom, setDateFrom] = useState(getMonthStart);
  const [dateTo, setDateTo] = useState(getEthiopiaDate);

  const [report, setReport] =
    useState<AppointmentSummaryResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function invalidateReport() {
    setReport(null);
    setError(null);
  }

  async function generateReport() {
    if (!canReadReport || loading) {
      return;
    }

    if (!isValidDate(dateFrom) || !isValidDate(dateTo)) {
      setError('Enter valid dates in YYYY-MM-DD format.');
      setReport(null);
      return;
    }

    if (dateFrom > dateTo) {
      setError('From Date must be on or before To Date.');
      setReport(null);
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const result = await reportsApi.getAppointmentSummary({
        dateFrom,
        dateTo,
      });

      setReport(result);
    } catch (err: unknown) {
      let message = 'Unable to generate appointment report.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err
      ) {
        const response = (
          err as {
            response?: {
              status?: number;
              data?: {
                message?: string | string[];
              };
            };
          }
        ).response;

        const serverMessage = response?.data?.message;

        if (Array.isArray(serverMessage)) {
          message = serverMessage.join(', ');
        } else if (typeof serverMessage === 'string') {
          message = serverMessage;
        } else if (response?.status === 401) {
          message = 'Your session has expired. Please sign in again.';
        } else if (response?.status === 403) {
          message = 'You do not have permission to view this report.';
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!canReadReport) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Appointment Reports
        </Typography>

        <Alert severity="warning">
          You do not have the report.read permission.
          Contact your system administrator.
        </Alert>
      </Box>
    );
  }

  const summary = report?.summary;

  const statusDistribution = summary
    ? [
        { label: 'Scheduled', count: summary.scheduled },
        { label: 'Confirmed', count: summary.confirmed },
        { label: 'Checked In', count: summary.checkedIn },
        { label: 'Completed', count: summary.completed },
        { label: 'Cancelled', count: summary.cancelled },
        { label: 'No Show', count: summary.noShow },
      ]
    : [];

  const totalAppointments = summary?.total ?? 0;

  const completionRate =
    totalAppointments > 0
      ? ((summary?.completed ?? 0) / totalAppointments) * 100
      : 0;

  const noShowRate =
    totalAppointments > 0
      ? ((summary?.noShow ?? 0) / totalAppointments) * 100
      : 0;


  const cards = summary
    ? [
        {
          label: 'Total Appointments',
          count: summary.total,
        },
        {
          label: 'Scheduled',
          count: summary.scheduled,
        },
        {
          label: 'Confirmed',
          count: summary.confirmed,
        },
        {
          label: 'Checked In',
          count: summary.checkedIn,
        },
        {
          label: 'Completed',
          count: summary.completed,
        },
        {
          label: 'Cancelled',
          count: summary.cancelled,
        },
        {
          label: 'No Show',
          count: summary.noShow,
        },
      ]
    : [];

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          mb: 3,
        }}
      >
        <AssessmentIcon color="primary" />

        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Appointment Reports
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Appointment activity and status summary
          </Typography>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 2 }}
          >
            Reporting Period
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <TextField
              label="From Date"
              type="date"
              size="small"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                invalidateReport();
              }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <TextField
              label="To Date"
              type="date"
              size="small"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                invalidateReport();
              }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <Button
              variant="contained"
              startIcon={
                loading ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <RefreshIcon />
                )
              }
              disabled={loading}
              onClick={() => void generateReport()}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!report && !loading && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Select a date range and click Generate Report.
        </Alert>
      )}

      {report && (
        <>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                {report.facility.name}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Facility Code: {report.facility.code}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Reporting Period: {report.period.dateFrom}
                {' to '}
                {report.period.dateTo}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Timezone: {report.period.timezone}
              </Typography>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
              mb: 3,
            }}
          >
            {cards.map((item) => (
              <Card
                key={item.label}
                sx={{ borderRadius: 3 }}
              >
                <CardContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, mt: 1 }}
                  >
                    {item.count}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 1 }}
              >
                Appointment Status Distribution
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Current appointment statuses for the selected
                reporting period.
              </Typography>

              {totalAppointments === 0 ? (
                <Alert severity="info">
                  No appointments were recorded for this period.
                </Alert>
              ) : (
                <Stack spacing={2.5}>
                  {statusDistribution.map((item) => {
                    const percentage =
                      (item.count / totalAppointments) * 100;

                    return (
                      <Box key={item.label}>
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent: 'space-between',
                            mb: 0.75,
                          }}
                        >
                          <Typography variant="body2">
                            {item.label}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {item.count} (
                            {percentage.toFixed(1)}%)
                          </Typography>
                        </Stack>

                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Completion Rate
                </Typography>

                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, mt: 1 }}
                >
                  {completionRate.toFixed(1)}%
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Completed appointments / total appointments
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  No-Show Rate
                </Typography>

                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, mt: 1 }}
                >
                  {noShowRate.toFixed(1)}%
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  No-show appointments / total appointments
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Alert severity="info">
            Counts are based on appointment scheduled start dates
            within the selected reporting period. Status counts
            reflect the current recorded status of each appointment.
            No patient-identifiable information is included.
          </Alert>
        </>
      )}
    </Box>
  );
}