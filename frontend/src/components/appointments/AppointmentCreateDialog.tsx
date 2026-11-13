import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

import { patientsApi } from '../../api/patients.api';
import {
  appointmentsApi,
  type CreateAppointmentRequest,
} from '../../api/appointments.api';

import { useAuth } from '../../auth/AuthContext';
import type { Patient } from '../../types/patient';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function patientLabel(patient: Patient): string {
  const name = [
    patient.firstName,
    patient.middleName,
    patient.lastName,
  ].filter(Boolean).join(' ');

  return `${patient.patientNumber} - ${name}`;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return 'Unable to create appointment.';
}

// Convert Ethiopia local date/time to UTC.
// Ethiopia uses UTC+03:00 throughout the year.
function ethiopiaToUtc(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}

export default function AppointmentCreateDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');

  const [loadingPatients, setLoadingPatients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appointmentType, setAppointmentType] = useState('FOLLOW_UP');
  const [reason, setReason] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;

    let active = true;

    const timer = setTimeout(async () => {
      setLoadingPatients(true);

      try {
        const result = await patientsApi.list({
          search: search.trim() || undefined,
          page: 1,
          limit: 20,
        });

        if (active) {
          setPatients(
            result.items.filter((item) => item.status === 'ACTIVE'),
          );
        }
      } catch {
        if (active) {
          setError('Unable to search patients.');
        }
      } finally {
        if (active) setLoadingPatients(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, search]);

  const handleSubmit = async () => {
    setError(null);

    if (!patient) {
      setError('Select a patient.');
      return;
    }

    if (!user?.facilityId) {
      setError(
        'Your account has no assigned facility. Contact the administrator.',
      );
      return;
    }

    if (!scheduledStart) {
      setError('Select an appointment date and time.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      setError('Duration must be between 5 and 480 minutes.');
      return;
    }

    try {
      const start = ethiopiaToUtc(scheduledStart);
      const end = new Date(
        new Date(start).getTime() + duration * 60000,
      ).toISOString();

      if (new Date(start).getTime() <= Date.now()) {
        setError('Appointment must be scheduled in the future.');
        return;
      }

      const data: CreateAppointmentRequest = {
        patientId: patient.id,
        facilityId: user.facilityId,
        appointmentType: appointmentType.trim() || undefined,
        reason: reason.trim() || undefined,
        scheduledStart: start,
        scheduledEnd: end,
        notes: notes.trim() || undefined,
      };

      setSaving(true);

      await appointmentsApi.create(data);

      onCreated();
      onClose();

      setPatient(null);
      setSearch('');
      setAppointmentType('FOLLOW_UP');
      setReason('');
      setScheduledStart('');
      setDuration(30);
      setNotes('');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>New Appointment</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Autocomplete
            options={patients}
            value={patient}
            loading={loadingPatients}
            getOptionLabel={patientLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, value) => setPatient(value)}
            onInputChange={(_, value, reason) => {
              if (reason === 'input') setSearch(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search patient"
                placeholder="Name or patient number"
                required
              />
            )}
          />

          <TextField
            label="Appointment Type"
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
            fullWidth
          />

          <TextField
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <TextField
            label="Date and Time (Ethiopia)"
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            fullWidth
            required
          />

          <TextField
            label="Duration (minutes)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            slotProps={{
              htmlInput: { min: 5, max: 480, step: 5 },
            }}
            fullWidth
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
            Appointment times are interpreted in Ethiopia local time
            (UTC+3).
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={saving}
          onClick={() => void handleSubmit()}
        >
          {saving ? 'Creating...' : 'Create Appointment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}