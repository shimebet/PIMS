
import { useRef, useState } from 'react';

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
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import {
  patientsApi,
  type PatientImportPreviewResponse,
  type PatientImportResult,
} from '../../api/patients.api';

interface PatientCsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (message: string) => void | Promise<void>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
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

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

export default function PatientCsvImportDialog({
  open,
  onClose,
  onImported,
}: PatientCsvImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);

  const [preview, setPreview] =
    useState<PatientImportPreviewResponse | null>(null);

  const [result, setResult] =
    useState<PatientImportResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setConfirmed(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (loading) return;

    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    setError(null);
    setAction('template');
    setLoading(true);

    try {
      await patientsApi.downloadImportTemplate();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    setError(null);
    setPreview(null);
    setResult(null);
    setConfirmed(false);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setError('Please select a CSV file.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError('The CSV file must not exceed 2 MB.');
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setError('The selected file is empty.');
      return;
    }

    setFile(selectedFile);
  };

  const handlePreview = async () => {
    if (!file) return;

    setError(null);
    setResult(null);
    setConfirmed(false);
    setLoading(true);
    setAction('preview');

    try {
      const response = await patientsApi.previewImport(file);
      setPreview(response);
    } catch (err) {
      setPreview(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  const handleImport = async () => {
    if (
      !file ||
      !preview ||
      preview.validRows === 0 ||
      !confirmed
    ) {
      return;
    }

    setError(null);
    setLoading(true);
    setAction('import');

    try {
      const response = await patientsApi.importPatients(file);

      setResult(response);
      setPreview(null);
      setConfirmed(false);

      await onImported(
        `CSV import completed: ${response.importedCount} patient(s) registered, ${response.skippedCount} skipped.`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setAction('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        CSV Bulk Patient Registration
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info">
            Upload a CSV file to validate patient records before
            registration. Only valid rows will be submitted for
            import. Use fictional test data until the import
            workflow has been fully verified.
          </Alert>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Step 1 — Download CSV Template
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Download the standard PIMS CSV template and
                complete the patient information.
              </Typography>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                  startIcon={
                    action === 'template'
                      ? <CircularProgress size={16} />
                      : undefined
                  }
                >
                  Download CSV Template
                </Button>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Step 2 — Select CSV File
              </Typography>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={loading}
                style={{ display: 'none' }}
              />


              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: {
                    xs: 'stretch',
                    sm: 'center',
                  },
                }}
              >

                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Choose CSV File
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {file ? file.name : 'No file selected'}
                </Typography>
              </Stack>

              {file && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  File size: {(file.size / 1024).toFixed(1)} KB
                </Typography>
              )}

              <Box>
                <Button
                  variant="contained"
                  onClick={handlePreview}
                  disabled={!file || loading}
                  startIcon={
                    action === 'preview'
                      ? <CircularProgress size={16} />
                      : undefined
                  }
                >
                  Validate and Preview
                </Button>
              </Box>
            </Stack>
          </Paper>

          {preview && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Step 3 — Validation Results
                </Typography>


                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >

                  <Chip
                    label={`Total: ${preview.totalRows}`}
                  />

                  <Chip
                    color="success"
                    label={`Valid: ${preview.validRows}`}
                  />

                  <Chip
                    color="error"
                    label={`Invalid: ${preview.invalidRows}`}
                  />

                  <Chip
                    color="warning"
                    label={`Duplicates: ${preview.duplicateRows}`}
                  />
                </Stack>

                <TableContainer sx={{ maxHeight: 350 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>CSV Row</TableCell>
                        <TableCell>Patient Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Validation / Geographic Messages</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {preview.rows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell>
                            {row.rowNumber}
                          </TableCell>

                          <TableCell>
                            {row.patient
                              ? [
                                row.patient.firstName,
                                row.patient.middleName,
                                row.patient.lastName,
                              ]
                                .filter(Boolean)
                                .join(' ')
                              : '—'}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={row.status}
                              color={
                                row.status === 'VALID'
                                  ? 'success'
                                  : row.status === 'DUPLICATE'
                                    ? 'warning'
                                    : 'error'
                              }
                            />
                          </TableCell>


<TableCell>
  <Stack spacing={0.75}>
    {row.errors.map((message, index) => (
      <Typography
        key={`error-${row.rowNumber}-${index}`}
        variant="body2"
        color="error.main"
        sx={{ overflowWrap: 'anywhere' }}
      >
        {message}
      </Typography>
    ))}

    {(row.warnings ?? []).map((message, index) => (
      <Typography
        key={`warning-${row.rowNumber}-${index}`}
        variant="body2"
        color="warning.main"
        sx={{ overflowWrap: 'anywhere' }}
      >
        Warning: {message}
      </Typography>
    ))}

    {row.errors.length === 0 &&
      (row.warnings?.length ?? 0) === 0 && (
        <Typography
          variant="body2"
          color="success.main"
        >
          Ready for import
        </Typography>
      )}

    {row.status === 'VALID' &&
      (row.warnings?.length ?? 0) > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
        >
          This warning does not block import.
        </Typography>
      )}
  </Stack>
</TableCell>


                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {preview.validRows > 0 && (
                  <Alert severity="warning">
                    Confirm that the file contains the intended
                    patients. Importing creates patient records
                    in the database. Invalid and duplicate rows
                    will be skipped.
                  </Alert>
                )}

                {preview.validRows > 0 && (
                  <Stack spacing={1}>
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) =>
                          setConfirmed(event.target.checked)
                        }
                        disabled={loading}
                      />{' '}
                      I have reviewed the CSV validation results
                      and confirm this import.
                    </label>

                    <Box>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleImport}
                        disabled={!confirmed || loading}
                        startIcon={
                          action === 'import'
                            ? <CircularProgress size={16} />
                            : undefined
                        }
                      >
                        Import {preview.validRows} Valid Patient(s)
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          {result && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  Import Completed
                </Typography>

                <Alert
                  severity={
                    result.skippedCount > 0
                      ? 'warning'
                      : 'success'
                  }
                >
                  {result.importedCount} patient(s) registered.
                  {' '}
                  {result.skippedCount} row(s) skipped.
                </Alert>

                {result.imported.length > 0 && (
                  <>
                    <Divider />

                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600 }}
                    >
                      Registered Patients
                    </Typography>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>CSV Row</TableCell>
                            <TableCell>Patient Number</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {result.imported.map((item) => (
                            <TableRow key={item.rowNumber}>
                              <TableCell>
                                {item.rowNumber}
                              </TableCell>

                              <TableCell>
                                {item.patientNumber}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {result.failed.length > 0 && (
                  <>
                    <Divider />

                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600 }}
                    >
                      Skipped Rows
                    </Typography>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>CSV Row</TableCell>
                            <TableCell>Reason</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {result.failed.map((item) => (
                            <TableRow key={item.rowNumber}>
                              <TableCell>
                                {item.rowNumber}
                              </TableCell>

                              <TableCell>
                                {item.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
