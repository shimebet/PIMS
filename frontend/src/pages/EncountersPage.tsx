
import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useAuth } from '../auth/AuthContext';
import CreateEncounterDialog from '../components/encounters/CreateEncounterDialog';
import EncounterClinicalActions from '../components/encounters/EncounterClinicalActions';

import {
  encountersApi,
  type Encounter,
  type EncounterListResponse,
} from '../api/encounters.api';

/* ============================================
   HELPERS
============================================ */

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to access encounters.';
    }

    const message: unknown =
      error.response?.data?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }
  }

  return 'Unable to load encounters. Please try again.';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

function patientName(encounter: Encounter): string {
  if (!encounter.patient) {
    return 'Patient information unavailable';
  }

  return [
    encounter.patient.firstName,
    encounter.patient.middleName,
    encounter.patient.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

function statusColor(
  status: string,
): 'success' | 'warning' | 'default' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';

    case 'IN_PROGRESS':
      return 'warning';

    case 'PLANNED':
      return 'info';

    default:
      return 'default';
  }
}

/* ============================================
   ENCOUNTERS PAGE
============================================ */

export default function EncountersPage() {
  const { user } = useAuth();

  const canRead =
    user?.permissions.includes('encounter.read') ?? false;

  const canCreate =
    user?.permissions.includes('encounter.create') ?? false;

  const [page, setPage] = useState(0);

  const [rowsPerPage, setRowsPerPage] =
    useState(20);

  const [status, setStatus] = useState('');

  const [data, setData] =
    useState<EncounterListResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [selectedEncounterId, setSelectedEncounterId] =
    useState<string | null>(null);

  const [selectedEncounter, setSelectedEncounter] =
    useState<Encounter | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState<string | null>(null);

  /* ========================================
     LOAD ENCOUNTERS
  ======================================== */

  useEffect(() => {
    if (!canRead) return;

    let active = true;

    async function loadEncounters() {
      setLoading(true);
      setError(null);

      try {
        const result = await encountersApi.list({
          page: page + 1,
          limit: rowsPerPage,
          status: status || undefined,
        });

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEncounters();

    return () => {
      active = false;
    };
  }, [
    canRead,
    page,
    rowsPerPage,
    status,
    refreshKey,
  ]);

  /* ========================================
     LOAD ENCOUNTER DETAILS
  ======================================== */

  useEffect(() => {
    if (!selectedEncounterId || !canRead) return;

    let active = true;

    async function loadDetails() {
      setDetailsLoading(true);
      setDetailsError(null);
      setSelectedEncounter(null);

      try {
        const result =
          await encountersApi.getById(
            selectedEncounterId!,
          );

        if (active) {
          setSelectedEncounter(result);
        }
      } catch (err) {
        if (active) {
          setDetailsError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setDetailsLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      active = false;
    };
  }, [selectedEncounterId, canRead]);

  const closeDetails = () => {
    setSelectedEncounterId(null);
    setSelectedEncounter(null);
    setDetailsError(null);
  };

  if (!canRead) {
    return (
      <Alert severity="warning">
        You do not have permission to view encounters.
      </Alert>
    );
  }

  return (
    <Box>
      <CreateEncounterDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(encounter) => {
          setSuccessMessage(
            `Encounter ${encounter.encounterNumber} created successfully.`,
          );
          setPage(0);
          setStatus('');
          setRefreshKey((value) => value + 1);
        }}
      />

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* PAGE HEADER */}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: 'space-between',
          alignItems: {
            xs: 'stretch',
            sm: 'center',
          },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700 }}
          >
            Encounter Management
          </Typography>

          <Typography color="text.secondary">
            Wan Offi Clinic — patient consultations
            and encounter history.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          {canCreate && (
            <Button
              variant="contained"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Encounter
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
          onClick={() =>
            setRefreshKey((value) => value + 1)
          }
          disabled={loading}
        >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* FILTERS */}

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
        }}
      >
<Stack
  direction={{ xs: 'column', sm: 'row' }}
  spacing={2}
  sx={{ alignItems: 'center' }}
>
          <FormControl
            fullWidth
            size="small"
          >
            <InputLabel id="encounter-status-label">
              Encounter Status
            </InputLabel>

            <Select
              labelId="encounter-status-label"
              value={status}
              label="Encounter Status"
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">
                All statuses
              </MenuItem>

              <MenuItem value="IN_PROGRESS">
                In Progress
              </MenuItem>

              <MenuItem value="COMPLETED">
                Completed
              </MenuItem>

              <MenuItem value="CANCELLED">
                Cancelled
              </MenuItem>

              <MenuItem value="PLANNED">
                Planned
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* ENCOUNTER TABLE */}

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 2,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  Encounter Number
                </TableCell>

                <TableCell>
                  Patient
                </TableCell>

                <TableCell>
                  Patient Number
                </TableCell>

                <TableCell>
                  Encounter Type
                </TableCell>

                <TableCell>
                  Started At
                </TableCell>

                <TableCell>
                  Status
                </TableCell>

                <TableCell align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading &&
                (data?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                    >
                      No encounters found.
                    </TableCell>
                  </TableRow>
                )}

              {!loading &&
                data?.items.map((encounter) => (
                  <TableRow
                    key={encounter.id}
                    hover
                  >
                    <TableCell>
                      {encounter.encounterNumber}
                    </TableCell>

                    <TableCell>
                      {patientName(encounter)}
                    </TableCell>

                    <TableCell>
                      {encounter.patient?.patientNumber ??
                        '-'}
                    </TableCell>

                    <TableCell>
                      {encounter.encounterType}
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        encounter.startedAt,
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={encounter.status.replaceAll(
                          '_',
                          ' ',
                        )}
                        size="small"
                        color={statusColor(
                          encounter.status,
                        )}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() =>
                          setSelectedEncounterId(
                            encounter.id,
                          )
                        }
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={data?.pagination.total ?? 0}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[
            10,
            20,
            50,
            100,
          ]}
          onPageChange={(_, newPage) =>
            setPage(newPage)
          }
          onRowsPerPageChange={(event) => {
            setRowsPerPage(
              Number(event.target.value),
            );
            setPage(0);
          }}
        />
      </Paper>

      {/* ENCOUNTER DETAILS */}

      <Dialog
        open={selectedEncounterId !== null}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Encounter Details
        </DialogTitle>

        <DialogContent dividers>
          {detailsLoading && (
            <Box
              sx={{
                textAlign: 'center',
                py: 3,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {detailsError && (
            <Alert severity="error">
              {detailsError}
            </Alert>
          )}

          {selectedEncounter && (
            <Stack spacing={2}>
              <Typography>
                <strong>Encounter Number:</strong>{' '}
                {selectedEncounter.encounterNumber}
              </Typography>

              <Typography>
                <strong>Patient:</strong>{' '}
                {patientName(selectedEncounter)}
              </Typography>

              <Typography>
                <strong>Encounter Type:</strong>{' '}
                {selectedEncounter.encounterType}
              </Typography>

              <Typography>
                <strong>Status:</strong>{' '}
                {selectedEncounter.status}
              </Typography>

              <Typography>
                <strong>Reason for Visit:</strong>{' '}
                {selectedEncounter.reasonForVisit || '-'}
              </Typography>

              <Typography>
                <strong>Chief Complaint:</strong>{' '}
                {selectedEncounter.chiefComplaint || '-'}
              </Typography>

              <Typography>
                <strong>Started At:</strong>{' '}
                {formatDate(
                  selectedEncounter.startedAt,
                )}
              </Typography>

              <Typography>
                <strong>Ended At:</strong>{' '}
                {formatDate(
                  selectedEncounter.endedAt,
                )}
              </Typography>
              <EncounterClinicalActions
                encounterId={selectedEncounter.id}
                encounterNumber={selectedEncounter.encounterNumber}
                status={selectedEncounter.status}
                permissions={user?.permissions ?? []}
                onUpdated={() => {
                  setRefreshKey((value) => value + 1);
                  setSelectedEncounterId(null);
                  setSelectedEncounter(null);
                }}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
