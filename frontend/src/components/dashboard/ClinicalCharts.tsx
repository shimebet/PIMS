import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { HealthReportIndicators } from '../../api/reports.api';

interface Props {
  indicators: HealthReportIndicators;
}

const COLORS = ['#16A34A', '#2563EB', '#F59E0B', '#DC2626'];

export default function ClinicalCharts({ indicators }: Props) {
  const activity = [
    {
      name: 'New patients',
      count: indicators.patientRegistration.newPatients,
    },
    {
      name: 'Encounters',
      count: indicators.consultations.totalEncounters,
    },
    {
      name: 'Lab orders',
      count: indicators.laboratory.ordersPlaced,
    },
    {
      name: 'Radiology',
      count: indicators.radiology.ordersPlaced,
    },
  ];

  const encounterStatus = [
    {
      name: 'Completed',
      value: indicators.consultations.completedEncounters,
    },
    {
      name: 'In progress',
      value: indicators.consultations.inProgressEncounters,
    },
    {
      name: 'Cancelled',
      value: indicators.consultations.cancelledEncounters,
    },
  ];

  const diagnostics = [
    {
      name: 'Laboratory',
      orders: indicators.laboratory.ordersPlaced,
      results: indicators.laboratory.resultsRecorded,
    },
    {
      name: 'Radiology',
      orders: indicators.radiology.ordersPlaced,
      results: indicators.radiology.resultsRecorded,
    },
  ];

  const activityTotal = activity.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const diagnosticTotal = diagnostics.reduce(
    (sum, item) => sum + item.orders + item.results,
    0,
  );
  const totalStatus = encounterStatus.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const encounterStatusDetails = encounterStatus.map((item) => ({
    ...item,
    percentage:
      totalStatus > 0
        ? (item.value / totalStatus) * 100
        : 0,
  }));

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 700 }}
      >
        Clinical Analytics
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Clinical Activity
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Recorded activity during the selected period
              </Typography>

              {activityTotal === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No clinical activity recorded for the selected period.
                </Alert>
              ) : (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Count"
                      fill="#2563EB"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Encounter Status
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Current status of encounters started in the period
              </Typography>

              {totalStatus === 0 ? (
                <Alert severity="info">
                  No encounter status data for this period.
                </Alert>
              ) : (
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={encounterStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={100}
                      >
                        {encounterStatus.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={COLORS[index]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                {encounterStatusDetails.map((item) => (
                  <Box
                    key={item.name}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2">
                      {item.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600 }}
                    >
                      {item.value} ({item.percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Diagnostic Activity
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Orders placed and results recorded during the period
              </Typography>

              {diagnosticTotal === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No laboratory or radiology activity recorded for the selected period.
                </Alert>
              ) : (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diagnostics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="orders"
                      name="Orders placed"
                      fill="#2563EB"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="results"
                      name="Results recorded"
                      fill="#16A34A"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2 }}
      >
        Counts reflect recorded events. Orders and results may
        relate to different patient visits or reporting dates.
        These charts do not represent pending workload.
      </Typography>
    </Box>
  );
}