import { useEffect, useState } from 'react';
import ClinicalCharts from './ClinicalCharts';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';

import {
  reportsApi,
  type HealthReportResponse,
  type HealthReportPeriod,
  type HealthReportQuery,
} from '../../api/reports.api';

function getIsoWeekParts(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - weekday);

  const isoYear = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(isoYear, 0, 1));

  const week = Math.ceil(
    ((date.getTime() - firstDay.getTime()) / 86400000 + 1) / 7,
  );

  return { year: isoYear, week };
}

function buildClinicalQuery(
  period: HealthReportPeriod,
  referenceDate: string,
): HealthReportQuery {
  const [year, month] = referenceDate.split('-').map(Number);

  switch (period) {
    case 'DAILY':
      return { period, year, date: referenceDate };

    case 'WEEKLY': {
      const iso = getIsoWeekParts(referenceDate);
      return {
        period,
        year: iso.year,
        week: iso.week,
      };
    }

    case 'MONTHLY':
      return { period, year, month };

    case 'QUARTERLY':
      return {
        period,
        year,
        quarter: Math.ceil(month / 3),
      };

    case 'HALF_YEARLY':
      return {
        period,
        year,
        halfYear: month <= 6 ? 1 : 2,
      };

    case 'YEARLY':
      return { period, year };
  }
}
interface Props {
  selectedDate: string;
  refreshKey: number;
}

export default function ClinicalOverview({ selectedDate, refreshKey }: Props) {
  const [report, setReport] =
    useState<HealthReportResponse | null>(null);

  const [clinicalPeriod, setClinicalPeriod] =
    useState<HealthReportPeriod>('DAILY');

  const [clinicalDate, setClinicalDate] = useState(selectedDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClinicalDate(selectedDate);
  }, [selectedDate]);
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clinicalDate) {
        setReport(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setReport(null);

      try {
        const result = await reportsApi.getHealthReport(
          buildClinicalQuery(clinicalPeriod, clinicalDate),
        );

        if (!cancelled) {
          setReport(result);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load clinical dashboard statistics.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [clinicalDate, clinicalPeriod, refreshKey]);

  const indicators = report?.indicators;

  const cards = indicators
    ? [
        {
          label: 'New Patients',
          value: indicators.patientRegistration.newPatients,
        },
        {
          label: 'Total Encounters',
          value: indicators.consultations.totalEncounters,
        },
        {
          label: 'Completed Encounters',
          value: indicators.consultations.completedEncounters,
        },
        {
          label: 'In-Progress Encounters',
          value: indicators.consultations.inProgressEncounters,
        },
        {
          label: 'Laboratory Orders',
          value: indicators.laboratory.ordersPlaced,
        },
        {
          label: 'Laboratory Results',
          value: indicators.laboratory.resultsRecorded,
        },
        {
          label: 'Radiology Orders',
          value: indicators.radiology.ordersPlaced,
        },
        {
          label: 'Radiology Results',
          value: indicators.radiology.resultsRecorded,
        },
      ]
    : [];

  return (
    <Card sx={{ mt: 3, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Clinical Overview
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Clinical activity for the selected reporting period
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="clinical-period-label">
                Reporting Period
              </InputLabel>

              <Select
                labelId="clinical-period-label"
                label="Reporting Period"
                value={clinicalPeriod}
                onChange={(event) =>
                  setClinicalPeriod(
                    event.target.value as HealthReportPeriod,
                  )
                }
              >
                <MenuItem value="DAILY">Daily</MenuItem>
                <MenuItem value="WEEKLY">Weekly</MenuItem>
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                <MenuItem value="HALF_YEARLY">Half-yearly</MenuItem>
                <MenuItem value="YEARLY">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Reference Date"
              type="date"
              value={clinicalDate}
              onChange={(event) =>
                setClinicalDate(event.target.value)
              }
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  min: '2000-01-01',
                  max: '2100-12-31',
                },
              }}
            />
          </Grid>
        </Grid>

        {report && !loading && !error && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Reporting period: {report.reportingPeriod.label}
            {' | '}
            Timezone: {report.reportingPeriod.timezone}
          </Typography>
        )}
        {loading && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && report && (
          <>
            <Grid container spacing={2}>
            {cards.map((item) => (
              <Grid
                key={item.label}
                size={{ xs: 12, sm: 6, md: 3 }}
              >
                <Card
                  variant="outlined"
                  sx={{ height: '100%' }}
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
                      sx={{ mt: 1, fontWeight: 700 }}
                    >
                      {item.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            </Grid>

            <ClinicalCharts indicators={report.indicators} />
          </>
        )}
      </CardContent>
    </Card>
  );
}