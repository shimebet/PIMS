import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  appointmentsApi,
  type Appointment,
} from '../../api/appointments.api';

interface Props {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onRescheduled: (updated: Appointment) => void;
}

const ETHIOPIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function toEthiopiaInput(iso: string): string {
  const date = new Date(
    new Date(iso).getTime() + ETHIOPIA_OFFSET_MS,
  );

  return date.toISOString().slice(0, 16);
}

function fromEthiopiaInput(value: string): string {
  const localAsUtc = new Date(value + ':00Z');

  return new Date(
    localAsUtc.getTime() - ETHIOPIA_OFFSET_MS,
  ).toISOString();
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (typeof message === 'string') return message;

    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }
  }

  return 'Unable to reschedule appointment.';
}

export default function AppointmentRescheduleDialog({
  open,
  appointment,
  onClose,
  onRescheduled,
}: Props) {
  const [scheduledStart, setScheduledStart] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !appointment) return;

    setScheduledStart(
      toEthiopiaInput(appointment.scheduledStart),
    );

    const minutes = appointment.scheduledEnd
      ? Math.round(
          (
            new Date(appointment.scheduledEnd).getTime() -
            new Date(appointment.scheduledStart).getTime()
          ) / 60000,
        )
      : 30;

    setDuration(minutes > 0 ? minutes : 30);
    setError(null);
  }, [open, appointment]);

  const canReschedule =
    appointment?.status === 'SCHEDULED' ||
    appointment?.status === 'CONFIRMED';

  const handleSubmit = async () => {
    if (!appointment || !canReschedule || saving) return;

    setError(null);

    if (!scheduledStart) {
      setError('Select the new appointment date and time.');
      return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setError('Duration must be between 1 and 1440 minutes.');
      return;
    }

    try {
      const start = fromEthiopiaInput(scheduledStart);
      const startDate = new Date(start);

      if (startDate.getTime() <= Date.now()) {
        setError('Appointment must be scheduled in the future.');
        return;
      }

      const endDate = new Date(
        startDate.getTime() + duration * 60000,
      );

      setSaving(true);

      const updated = await appointmentsApi.reschedule(
        appointment.id,
        {
          scheduledStart: startDate.toISOString(),
          scheduledEnd: endDate.toISOString(),
        },
      );

      onRescheduled(updated);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reschedule Appointment</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant="body2">
            Appointment: <strong>{appointment?.appointmentNumber}</strong>
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Current scheduled time:{' '}
            {appointment
              ? new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Africa/Addis_Ababa',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(appointment.scheduledStart))
              : '-'}
          </Typography>

          {!canReschedule && (
            <Alert severity="warning">
              Only scheduled or confirmed appointments can be rescheduled.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            required
            label="New Date and Time (Ethiopia)"
            type="datetime-local"
            value={scheduledStart}
            onChange={(event) => setScheduledStart(event.target.value)}
            disabled={!canReschedule || saving}
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />

          <TextField
            fullWidth
            required
            label="Duration (minutes)"
            type="number"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            disabled={!canReschedule || saving}
            slotProps={{
              htmlInput: {
                min: 1,
                max: 1440,
                step: 1,
              },
            }}
          />

          <Typography variant="caption" color="text.secondary">
            All times are entered in Ethiopia local time (UTC+3).
            The backend checks for scheduling conflicts.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!canReschedule || saving}
        >
          {saving ? 'Saving...' : 'Save New Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}