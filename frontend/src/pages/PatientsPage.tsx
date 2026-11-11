
import { useEffect, useState } from 'react';

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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import axios from 'axios';

import { useAuth } from '../auth/AuthContext';
import { patientsApi } from '../api/patients.api';

import PatientRegistrationDialog from
  '../components/patients/PatientRegistrationDialog';
  import PatientCsvImportDialog from
  '../components/patients/PatientCsvImportDialog';

import type {
  Patient,
  PatientListResponse,
} from '../types/patient';

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to access this resource.';
    }

    const message = error.response?.data?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }
  }

  return 'Unable to load patient information. Please try again.';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
}

function fullName(patient: Patient): string {
  return [
    patient.firstName,
    patient.middleName,
    patient.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

function getPhone(patient: Patient): string {
  return (
    patient.contacts?.find(
      (contact) => contact.contactType === 'PHONE',
    )?.contactValue ?? '-'
  );
}

export default function PatientsPage() {
  const { user } = useAuth();

  const canRead =
    user?.permissions.includes('patient.read') ?? false;

  const canCreate =
    user?.permissions.includes('patient.create') ?? false;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [data, setData] =
    useState<PatientListResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [registrationOpen, setRegistrationOpen] =
    useState(false);
  const [csvImportOpen, setCsvImportOpen] =
  useState(false);  

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] =
    useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;

    let active = true;

    async function loadPatients() {
      setLoading(true);
      setError(null);

      try {
        const result = await patientsApi.list({
          search: search || undefined,
          page: page + 1,
          limit: rowsPerPage,
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

    void loadPatients();

    return () => {
      active = false;
    };
  }, [
    canRead,
    search,
    page,
    rowsPerPage,
    refreshKey,
  ]);

  useEffect(() => {
    if (!selectedPatientId || !canRead) return;

    let active = true;

    async function loadPatientDetails() {
      setDetailsLoading(true);
      setDetailsError(null);
      setSelectedPatient(null);

      try {
        const result = await patientsApi.getById(
          selectedPatientId!,
        );

        if (active) {
          setSelectedPatient(result);
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

    void loadPatientDetails();

    return () => {
      active = false;
    };
  }, [selectedPatientId, canRead]);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const closeDetails = () => {
    setSelectedPatientId(null);
    setSelectedPatient(null);
    setDetailsError(null);
  };

  const handlePatientCreated = () => {
    setRegistrationOpen(false);

    setSuccessMessage(
      'Patient registered successfully.',
    );

    setSearchInput('');
    setSearch('');
    setPage(0);

    setRefreshKey((value) => value + 1);
  };
  const handlePatientsImported = (message: string) => {
  setSuccessMessage(message);

  setSearchInput('');
  setSearch('');
  setPage(0);

  setRefreshKey((value) => value + 1);
};

  if (!canRead) {
    return (
      <Alert severity="warning">
        You do not have permission to view patient records.
      </Alert>
    );
  }

  return (
    <Box>
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
            Patient Management
          </Typography>

          <Typography color="text.secondary">
            Search, register, and manage patient records.
          </Typography>
        </Box>

{canCreate && (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    spacing={1.5}
  >
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => {
        setSuccessMessage(null);
        setRegistrationOpen(true);
      }}
    >
      Register Patient
    </Button>

    <Button
      variant="outlined"
      startIcon={<UploadFileIcon />}
      onClick={() => {
        setSuccessMessage(null);
        setCsvImportOpen(true);
      }}
    >
      Import Patients (CSV)
    </Button>
  </Stack>
)}

      </Stack>

      {/* SUCCESS MESSAGE */}

      {successMessage && (
        <Alert
          severity="success"
          onClose={() => setSuccessMessage(null)}
          sx={{ mb: 2 }}
        >
          {successMessage}
        </Alert>
      )}

      {/* PATIENT SEARCH AND TABLE */}

      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <TextField
            fullWidth
            label="Search patients"
            placeholder="Name, patient number, MRN, phone..."
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSearch();
              }
            }}
          />

          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            Search
          </Button>

          <Button
            variant="outlined"
            onClick={clearSearch}
            disabled={loading}
          >
            Clear
          </Button>
        </Stack>

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
                  Patient Number
                </TableCell>

                <TableCell>
                  Full Name
                </TableCell>

                <TableCell>
                  Gender
                </TableCell>

                <TableCell>
                  Date of Birth
                </TableCell>

                <TableCell>
                  Phone
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
                      No patients found.
                    </TableCell>
                  </TableRow>
                )}

              {!loading &&
                data?.items.map((patient) => (
                  <TableRow
                    key={patient.id}
                    hover
                  >
                    <TableCell>
                      {patient.patientNumber}
                    </TableCell>

                    <TableCell>
                      {fullName(patient)}
                    </TableCell>

                    <TableCell>
                      {patient.gender || '-'}
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        patient.dateOfBirth,
                      )}
                    </TableCell>

                    <TableCell>
                      {getPhone(patient)}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={patient.status}
                        size="small"
                        color={
                          patient.status === 'ACTIVE'
                            ? 'success'
                            : 'default'
                        }
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() =>
                          setSelectedPatientId(
                            patient.id,
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

        {/* PAGINATION */}

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

      {/* PATIENT DETAILS DIALOG */}

      <Dialog
        open={selectedPatientId !== null}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Patient Details
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

          {selectedPatient && (
            <Stack spacing={2}>
              <Typography>
                <strong>
                  Patient Number:
                </strong>{' '}
                {selectedPatient.patientNumber}
              </Typography>

              <Typography>
                <strong>
                  Medical Record Number:
                </strong>{' '}
                {selectedPatient.medicalRecordNumber || '-'}
              </Typography>

              <Typography>
                <strong>
                  Full Name:
                </strong>{' '}
                {fullName(selectedPatient)}
              </Typography>

              <Typography>
                <strong>
                  Date of Birth:
                </strong>{' '}
                {formatDate(
                  selectedPatient.dateOfBirth,
                )}
              </Typography>

              <Typography>
                <strong>
                  Gender:
                </strong>{' '}
                {selectedPatient.gender || '-'}
              </Typography>

              <Typography>
                <strong>
                  Blood Group:
                </strong>{' '}
                {selectedPatient.bloodGroup || '-'}
              </Typography>

              <Typography>
                <strong>
                  Marital Status:
                </strong>{' '}
                {selectedPatient.maritalStatus || '-'}
              </Typography>

              <Typography>
                <strong>
                  Nationality:
                </strong>{' '}
                {selectedPatient.nationality || '-'}
              </Typography>

              <Typography>
                <strong>
                  Preferred Language:
                </strong>{' '}
                {selectedPatient.preferredLanguage || '-'}
              </Typography>

              <Typography>
                <strong>
                  Occupation:
                </strong>{' '}
                {selectedPatient.occupation || '-'}
              </Typography>

              <Typography>
                <strong>
                  Status:
                </strong>{' '}
                {selectedPatient.status}
              </Typography>

              <Divider />

              {/* IDENTIFICATION */}

              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Patient Identification
              </Typography>

              {selectedPatient.identifiers?.length ? (
                selectedPatient.identifiers.map(
                  (identifier, index) => (
                    <Typography
                      key={identifier.id ?? index}
                    >
                      {identifier.identifierType}:{' '}
                      {identifier.identifierValue}
                    </Typography>
                  ),
                )
              ) : (
                <Typography color="text.secondary">
                  No identification information available.
                </Typography>
              )}

              <Divider />

              {/* CONTACT INFORMATION */}

              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Contact Information
              </Typography>

              {selectedPatient.contacts?.length ? (
                selectedPatient.contacts.map(
                  (contact, index) => (
                    <Typography
                      key={contact.id ?? index}
                    >
                      {contact.contactType}:{' '}
                      {contact.contactValue}
                    </Typography>
                  ),
                )
              ) : (
                <Typography color="text.secondary">
                  No contact information available.
                </Typography>
              )}

              <Divider />

              {/* ADDRESS INFORMATION */}

              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
              >
                Address Information
              </Typography>

              {selectedPatient.addresses?.length ? (
                selectedPatient.addresses.map(
                  (address, index) => (
                    <Typography
                      key={address.id ?? index}
                    >
                      {[
                        address.country,
                        address.region,
                        address.zone,
                        address.district,
                        address.city,
                        address.subCity,
                        address.kebele,
                        address.street,
                        address.houseNumber,
                      ]
                        .filter(Boolean)
                        .join(', ') ||
                        'Address not specified'}
                    </Typography>
                  ),
                )
              ) : (
                <Typography color="text.secondary">
                  No address information available.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PATIENT REGISTRATION DIALOG */}

      {canCreate && (
        <PatientRegistrationDialog
          open={registrationOpen}
          onClose={() =>
            setRegistrationOpen(false)
          }
          onCreated={handlePatientCreated}
        />
      )}

{/* CSV BULK PATIENT REGISTRATION DIALOG */}

{canCreate && (
  <PatientCsvImportDialog
    open={csvImportOpen}
    onClose={() => setCsvImportOpen(false)}
    onImported={handlePatientsImported}
  />
)}

    </Box>
  );
}
