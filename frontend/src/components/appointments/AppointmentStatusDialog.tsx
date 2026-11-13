import { useEffect, useState } from 'react';
import axios from 'axios';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  appointmentsApi,
  type Appointment,
  type AppointmentStatus,
} from '../../api/appointments.api';

const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

interface Props {
  open: boolean;
  appointment: Appointment | null;
  canCancel: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return 'Unable to update appointment status.';
}

export default function AppointmentStatusDialog({
  open,
  appointment,
  canCancel,
  onClose,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus('');
      setReason('');
      setError(null);
    }
  }, [open, appointment?.id]);

  const allowed = appointment
    ? transitions[appointment.status].filter(
        (value) => value !== 'CANCELLED' || canCancel,
      )
    : [];

  const handleSave = async () => {
    if (!appointment || !status || !allowed.includes(status)) {
      setError('Select a valid new status.');
      return;
    }

    if (status === 'CANCELLED' && !reason.trim()) {
      setError('A cancellation reason is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await appointmentsApi.updateStatus(appointment.id, {
        status,
        reason: reason.trim() || undefined,
      });

      onUpdated();
      onClose();
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
      <DialogTitle>Manage Appointment Status</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography>
            Appointment: <strong>{appointment?.appointmentNumber}</strong>
          </Typography>

          <Typography color="text.secondary">
            Current status: {appointment?.status.replaceAll('_', ' ')}
          </Typography>

          {allowed.length === 0 ? (
            <Alert severity="info">
              No status changes are available for this appointment.
            </Alert>
          ) : (
            <TextField
              select
              fullWidth
              label="New Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AppointmentStatus)
              }
            >
              {allowed.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          )}

          {status === 'CANCELLED' && (
            <TextField
              label="Cancellation Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              multiline
              minRows={2}
              required
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>

        <Button
          variant="contained"
          disabled={saving || !status || !allowed.includes(status)}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}