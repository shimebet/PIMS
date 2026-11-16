import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';

import { useAuth } from '../auth/AuthContext';
import { administrationApi } from '../api/administration.api';

import type {
  AuditEntry,
  AuditListResponse,
} from '../types/administration';

const pageSizes = [10, 20, 50, 100];

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response;

    const message = response?.data?.message;

    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }

  return error instanceof Error
    ? error.message
    : 'Unable to load audit records.';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function actorName(entry: AuditEntry): string {
  if (entry.user) {
    const name = [
      entry.user.firstName,
      entry.user.lastName,
    ].filter(Boolean).join(' ');

    return name
      ? `${name} (${entry.user.username})`
      : entry.user.username;
  }

  return entry.userId ?? 'System / Unknown';
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not available';
  }

  try {
    return JSON.stringify(value, null, 2) ?? 'Not available';
  } catch {
    return 'Unable to display value';
  }
}

function validateResponse(value: AuditListResponse): AuditListResponse {
  if (
    !value ||
    !Array.isArray(value.items) ||
    !value.pagination ||
    !Number.isFinite(value.pagination.total) ||
    !Number.isFinite(value.pagination.totalPages)
  ) {
    throw new Error('Unexpected audit API response structure.');
  }

  return value;
}

export default function AuditLogsPage() {
  const { user } = useAuth();

  const canRead = Boolean(
    user?.permissions.includes('audit.read')
  );

  const [records, setRecords] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [actionInput, setActionInput] = useState('');
  const [eventTypeInput, setEventTypeInput] = useState('');

  const [actionFilter, setActionFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedRecord, setSelectedRecord] =
    useState<AuditEntry | null>(null);

  const loadAudit = useCallback(async () => {
    if (!canRead) {
      setRecords([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = validateResponse(
        await administrationApi.listAudit({
          page,
          limit,
          ...(actionFilter ? { action: actionFilter } : {}),
          ...(eventTypeFilter
            ? { eventType: eventTypeFilter }
            : {}),
        }),
      );

      setRecords(response.items);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: unknown) {
      setRecords([]);
      setTotal(0);
      setTotalPages(0);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, actionFilter, eventTypeFilter]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const applyFilters = () => {
    setPage(1);
    setActionFilter(actionInput.trim());
    setEventTypeFilter(eventTypeInput.trim());
  };

  const clearFilters = () => {
    setActionInput('');
    setEventTypeInput('');
    setActionFilter('');
    setEventTypeFilter('');
    setPage(1);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <HistoryIcon color="primary" />

            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Audit Logs
            </Typography>
          </Stack>

          <Typography color="text.secondary">
            Wan Offi Clinic activity and security history
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void loadAudit()}
          disabled={!canRead || loading}
        >
          Refresh
        </Button>
      </Stack>

      {!canRead ? (
        <Alert severity="warning">
          Your account does not have permission to view audit logs.
        </Alert>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Filters
              </Typography>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ alignItems: { md: 'center' } }}
              >
                <TextField
                  label="Action"
                  placeholder="e.g. USER_LOCK"
                  size="small"
                  value={actionInput}
                  onChange={(event) =>
                    setActionInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyFilters();
                  }}
                  fullWidth
                />

                <TextField
                  label="Event Type"
                  placeholder="e.g. SECURITY"
                  size="small"
                  value={eventTypeInput}
                  onChange={(event) =>
                    setEventTypeInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyFilters();
                  }}
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={applyFilters}
                  disabled={loading}
                >
                  Apply
                </Button>

                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Clear
                </Button>
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 2 }}
              >
                Filters use exact backend values. General text
                search and date-range filtering are not yet
                supported by the API.
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                  mb: 2,
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', md: 'center' },
                }}
              >
                <Typography variant="h6">
                  Audit Records ({total})
                </Typography>

                <TextField
                  select
                  size="small"
                  label="Rows per page"
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  sx={{ minWidth: 150 }}
                >
                  {pageSizes.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    py: 6,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Actor</TableCell>
                        <TableCell>Event Type</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Resource</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {records.map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell>
                            {formatDate(
                              entry.occurredAt ?? entry.createdAt
                            )}
                          </TableCell>

                          <TableCell>
                            {actorName(entry)}
                          </TableCell>

                          <TableCell>
                            {entry.eventType ?? '-'}
                          </TableCell>

                          <TableCell>
                            {entry.action}
                          </TableCell>

                          <TableCell>
                            {entry.resourceType ?? '-'}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                entry.success === false
                                  ? 'Failed'
                                  : 'Success'
                              }
                              color={
                                entry.success === false
                                  ? 'error'
                                  : 'success'
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() =>
                                setSelectedRecord(entry)
                              }
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {records.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No audit records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                  mt: 3,
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', md: 'center' },
                }}
              >
                <Typography color="text.secondary">
                  Page {page} of {Math.max(totalPages, 1)}
                </Typography>

                <Pagination
                  count={Math.max(totalPages, 1)}
                  page={Math.min(
                    page,
                    Math.max(totalPages, 1)
                  )}
                  onChange={(_event, value) => setPage(value)}
                  disabled={loading || totalPages <= 1}
                  color="primary"
                />
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Audit Record Details
        </DialogTitle>

        <DialogContent>
          {selectedRecord && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography>
                <strong>Time:</strong>{' '}
                {formatDate(selectedRecord.occurredAt)}
              </Typography>

              <Typography>
                <strong>Actor:</strong>{' '}
                {actorName(selectedRecord)}
              </Typography>

              <Typography>
                <strong>Event Type:</strong>{' '}
                {selectedRecord.eventType ?? '-'}
              </Typography>

              <Typography>
                <strong>Action:</strong>{' '}
                {selectedRecord.action}
              </Typography>

              <Typography>
                <strong>Resource:</strong>{' '}
                {selectedRecord.resourceType ?? '-'}
                {' / '}
                {selectedRecord.resourceId ?? '-'}
              </Typography>

              <Typography>
                <strong>Patient ID:</strong>{' '}
                {selectedRecord.patientId ?? '-'}
              </Typography>

              <Typography>
                <strong>IP Address:</strong>{' '}
                {selectedRecord.ipAddress ?? '-'}
              </Typography>

              <Typography>
                <strong>Request ID:</strong>{' '}
                {selectedRecord.requestId ?? '-'}
              </Typography>

              {selectedRecord.failureReason && (
                <Alert severity="error">
                  {selectedRecord.failureReason}
                </Alert>
              )}

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Previous Values
              </Typography>

              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  maxHeight: 220,
                  overflow: 'auto',
                }}
              >
                {prettyJson(selectedRecord.oldValues)}
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                New Values
              </Typography>

              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  maxHeight: 220,
                  overflow: 'auto',
                }}
              >
                {prettyJson(selectedRecord.newValues)}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedRecord(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}