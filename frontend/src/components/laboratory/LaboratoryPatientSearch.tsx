import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
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

import axios from 'axios';

import { useAuth } from '../../auth/AuthContext';
import { patientsApi } from '../../api/patients.api';
import type { Patient } from '../../types/patient';

interface Props {
  onSelectPatient: (patient: Patient) => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to search patients.';
    }

    const message = error.response?.data?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }
  }

  return 'Unable to search patients.';
}

function patientName(patient: Patient): string {
  return [
    patient.firstName,
    patient.middleName,
    patient.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function LaboratoryPatientSearch({
  onSelectPatient,
}: Props) {
  const { user } = useAuth();

  const canRead =
    user?.permissions.includes('patient.read') ?? false;

  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const query = search.trim();

    if (!query || !canRead || loading) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setPatients([]);

    try {
      const response = await patientsApi.list({
        search: query,
        page: 1,
        limit: 20,
      });

      setPatients(response.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!canRead) {
    return (
      <Alert severity="warning">
        Your account does not have patient search permission.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          Search Patients
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
        >
          <TextField
            label="Search patient"
            placeholder="Name, patient number, MRN, phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSearch();
              }
            }}
            fullWidth
            size="small"
          />

          <Button
            variant="contained"
            onClick={() => void handleSearch()}
            disabled={loading || !search.trim()}
          >
            Search
          </Button>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && searched && !error &&
          patients.length === 0 && (
            <Alert severity="info">
              No matching patients found.
            </Alert>
          )}

        {patients.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.patientNumber}</TableCell>
                    <TableCell>{patientName(patient)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => onSelectPatient(patient)}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {patients.length === 20 && (
          <Typography variant="caption" color="text.secondary">
            Showing the first 20 matching patients.
            Refine your search to narrow the results.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
