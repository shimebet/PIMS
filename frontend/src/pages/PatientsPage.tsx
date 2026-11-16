
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

import PatientEditDialog from
  '../components/patients/PatientEditDialog';

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

  const canUpdate =
    user?.permissions.includes('patient.update') ?? false;
  const canDelete =
    user?.permissions.includes('patient.delete') ?? false;

  const canDeactivate =
    user?.permissions.includes('patient.deactivate') ?? false;

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [patientStatus, setPatientStatus] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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

  const [editingPatient, setEditingPatient] =
    useState<Patient | null>(null);

  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);
  const [activationPatient, setActivationPatient] =
    useState<Patient | null>(null);

  const [activating, setActivating] = useState(false);

  const [activationError, setActivationError] =
    useState<string | null>(null);
  const [deletionPatient, setDeletionPatient] =
    useState<Patient | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] =
    useState<string | null>(null);

  const [deactivationPatient, setDeactivationPatient] =
    useState<Patient | null>(null);

  const [deactivating, setDeactivating] =
    useState(false);

  const [deactivationError, setDeactivationError] =
    useState<string | null>(null);

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
          status: patientStatus === 'ALL'
            ? undefined
            : patientStatus,
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
    patientStatus,
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

  const handlePatientStatusChange = (
    value: 'ALL' | 'ACTIVE' | 'INACTIVE',
  ) => {
    setPage(0);
    setPatientStatus(value);
  };
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

  const closeActivationDialog = () => {
    if (activating) return;

    setActivationPatient(null);
    setActivationError(null);
  };

  const confirmPatientActivation = async () => {
    if (
      !canUpdate ||
      !activationPatient ||
      activationPatient.status !== 'INACTIVE' ||
      activating
    ) {
      return;
    }

    setActivating(true);
    setActivationError(null);

    try {
      await patientsApi.activate(activationPatient.id);

      setSuccessMessage('Patient activated successfully.');
      setActivationPatient(null);
      setSelectedPatient(null);
      setSelectedPatientId(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setActivationError(getErrorMessage(err));
    } finally {
      setActivating(false);
    }
  };
  const closeDeletionDialog = () => {
    if (deleting) return;
    setDeletionPatient(null);
    setDeletionReason('');
    setDeletionConfirmation('');
    setDeletionError(null);
  };

  const confirmPatientDeletion = async () => {
    if (
      !canDelete ||
      !deletionPatient ||
      deletionReason.trim().length < 10 ||
      deletionConfirmation !== 'DELETE' ||
      deleting
    ) {
      return;
    }

    setDeleting(true);
    setDeletionError(null);

    try {
      await patientsApi.softDelete(
        deletionPatient.id,
        deletionReason.trim(),
        deletionConfirmation,
      );

      setSuccessMessage('Patient deleted successfully.');
      setDeletionPatient(null);
      setDeletionReason('');
      setDeletionConfirmation('');
      setSelectedPatient(null);
      setSelectedPatientId(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setDeletionError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const closeDeactivationDialog = () => {
    if (deactivating) return;

    setDeactivationPatient(null);
    setDeactivationError(null);
  };

  const confirmPatientDeactivation = async () => {
    if (
      !canDeactivate ||
      !deactivationPatient ||
      deactivationPatient.status !== 'ACTIVE' ||
      deactivating
    ) {
      return;
    }

    setDeactivating(true);
    setDeactivationError(null);

    try {
      await patientsApi.deactivate(deactivationPatient.id);

      setSuccessMessage('Patient deactivated successfully.');
      setDeactivationPatient(null);
      setSelectedPatient(null);
      setSelectedPatientId(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setDeactivationError(getErrorMessage(err));
    } finally {
      setDeactivating(false);
    }
  };
  const handlePatientUpdated = () => {
    setEditingPatient(null);
    setSuccessMessage('Patient updated successfully.');
    setRefreshKey((value) => value + 1);
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

          <FormControl
            sx={{
              minWidth: { xs: '100%', sm: 190 },
            }}
          >
            <InputLabel id="patient-status-filter-label">
              Patient status
            </InputLabel>

            <Select
              labelId="patient-status-filter-label"
              id="patient-status-filter"
              value={patientStatus}
              label="Patient status"
              onChange={(event) => {
                handlePatientStatusChange(
                  event.target.value as
                    'ALL' | 'ACTIVE' | 'INACTIVE',
                );
              }}
            >
              <MenuItem value="ALL">
                All Patients
              </MenuItem>

              <MenuItem value="ACTIVE">
                Active
              </MenuItem>

              <MenuItem value="INACTIVE">
                Inactive
              </MenuItem>
            </Select>
          </FormControl>

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
          {canUpdate && selectedPatient && !detailsLoading && (
            <Button
              variant="contained"
              onClick={() => {
                setEditingPatient(selectedPatient);
                closeDetails();
              }}
            >
              Edit Patient
            </Button>
          )}

          {canUpdate &&
            selectedPatient?.status === 'INACTIVE' &&
            !detailsLoading && (
              <Button
                color="success"
                variant="contained"
                onClick={() => {
                  setActivationError(null);
                  setActivationPatient(selectedPatient);
                  closeDetails();
                }}
              >
                Activate Patient
              </Button>
            )}
          {canDelete && selectedPatient && !detailsLoading && (
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                setDeletionPatient(selectedPatient);
                setDeletionReason('');
                setDeletionConfirmation('');
                setDeletionError(null);
                closeDetails();
              }}
            >
              Delete Patient
            </Button>
          )}

          {canDeactivate &&
            selectedPatient?.status === 'ACTIVE' &&
            !detailsLoading && (
              <Button
                color="error"
                onClick={() => {
                  setDeactivationError(null);
                  setDeactivationPatient(selectedPatient);
                  closeDetails();
                }}
              >
                Deactivate Patient
              </Button>
            )}          <Button onClick={closeDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* PATIENT ACTIVATION CONFIRMATION */}
      <Dialog
        open={activationPatient !== null}
        onClose={closeActivationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Patient Activation
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Activation will restore this patient's
              ACTIVE status. Existing medical records
              will remain unchanged.
            </Alert>

            {activationPatient && (
              <Typography>
                Activate patient{' '}
                <strong>
                  {fullName(activationPatient)}
                </strong>
                {' '}(
                {activationPatient.patientNumber}
                )?
              </Typography>
            )}

            {activationError && (
              <Alert severity="error">
                {activationError}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeActivationDialog}
            disabled={activating}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="success"
            disabled={
              activating ||
              !canUpdate ||
              activationPatient?.status !== 'INACTIVE'
            }
            onClick={() => {
              void confirmPatientActivation();
            }}
          >
            {activating
              ? 'Activating...'
              : 'Confirm Activation'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* PATIENT DEACTIVATION CONFIRMATION */}

      <Dialog
        open={deactivationPatient !== null}
        onClose={closeDeactivationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Patient Deactivation
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Deactivation prevents new clinical encounters
              for this patient. Existing medical history
              will be retained.
            </Alert>

            {deactivationPatient && (
              <Typography>
                Deactivate patient{' '}
                <strong>
                  {fullName(deactivationPatient)}
                </strong>
                {' '}(
                {deactivationPatient.patientNumber}
                )?
              </Typography>
            )}

            {deactivationError && (
              <Alert severity="error">
                {deactivationError}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeDeactivationDialog}
            disabled={deactivating}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            disabled={
              deactivating ||
              !canDeactivate ||
              deactivationPatient?.status !== 'ACTIVE'
            }
            onClick={() => {
              void confirmPatientDeactivation();
            }}
          >
            {deactivating
              ? 'Deactivating...'
              : 'Confirm Deactivation'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* PATIENT DELETE CONFIRMATION */}
      <Dialog
        open={deletionPatient !== null}
        onClose={closeDeletionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Patient Deletion</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              This action removes the patient from active
              management. Medical history is retained for
              audit and recordkeeping purposes.
            </Alert>

            {deletionPatient && (
              <Typography>
                Delete patient{' '}
                <strong>{fullName(deletionPatient)}</strong>
                {' '}({deletionPatient.patientNumber})?
              </Typography>
            )}

            <TextField
              label="Reason for deletion"
              value={deletionReason}
              onChange={(event) =>
                setDeletionReason(event.target.value)
              }
              multiline
              minRows={2}
              fullWidth
              required
              helperText="Enter at least 10 characters."
              disabled={deleting}
            />

            <TextField
              label="Type DELETE to confirm"
              value={deletionConfirmation}
              onChange={(event) =>
                setDeletionConfirmation(event.target.value)
              }
              fullWidth
              required
              disabled={deleting}
            />

            {deletionError && (
              <Alert severity="error">
                {deletionError}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={closeDeletionDialog}
            disabled={deleting}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={
              deleting ||
              !canDelete ||
              deletionReason.trim().length < 10 ||
              deletionConfirmation !== 'DELETE'
            }
            onClick={() => {
              void confirmPatientDeletion();
            }}
          >
            {deleting ? 'Deleting...' : 'Confirm Delete Patient'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PATIENT EDIT DIALOG */}

      {canUpdate && (
        <PatientEditDialog
          open={editingPatient !== null}
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onUpdated={handlePatientUpdated}
        />
      )}

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
