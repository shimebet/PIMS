import { useState } from 'react';
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
import axios from 'axios';

import { useAuth } from '../../auth/AuthContext';
import {
  encountersApi,
  type Encounter,
} from '../../api/encounters.api';
import LaboratoryPatientSearch from '../laboratory/LaboratoryPatientSearch';
import type { Patient } from '../../types/patient';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (encounter: Encounter) => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to create encounters.';
    }

    const message = error.response?.data?.message;

    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return 'Unable to create encounter.';
}

export default function CreateEncounterDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth();

  const canCreate =
    user?.permissions.includes('encounter.create') ?? false;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounterType, setEncounterType] = useState('OUTPATIENT');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setPatient(null);
    setEncounterType('OUTPATIENT');
    setReasonForVisit('');
    setChiefComplaint('');
    setError(null);
  }

  function handleClose() {
    if (saving) return;
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (
      !canCreate ||
      !patient ||
      !user?.facilityId ||
      !encounterType.trim() ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const encounter = await encountersApi.create({
        patientId: patient.id,
        facilityId: user.facilityId,
        encounterType: encounterType.trim(),
        reasonForVisit: reasonForVisit.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
      });

      resetForm();
      onCreated(encounter);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    canCreate &&
    !!user?.facilityId &&
    !!patient &&
    !!encounterType.trim() &&
    !saving;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Start Patient Visit</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {!canCreate && (
            <Alert severity="warning">
              Your account does not have encounter.create permission.
            </Alert>
          )}

          {!user?.facilityId && (
            <Alert severity="warning">
              Your account has no assigned facility.
              Contact an administrator before creating encounters.
            </Alert>
          )}

          <LaboratoryPatientSearch
            onSelectPatient={setPatient}
          />

          {patient && (
            <Alert severity="success">
              Selected patient: {patient.patientNumber} —{' '}
              {[
                patient.firstName,
                patient.middleName,
                patient.lastName,
              ].filter(Boolean).join(' ')}
            </Alert>
          )}

          <TextField
            select
            label="Encounter Type"
            value={encounterType}
            onChange={(event) =>
              setEncounterType(event.target.value)
            }
            fullWidth
          >
            <MenuItem value="OUTPATIENT">Outpatient</MenuItem>
            <MenuItem value="EMERGENCY">Emergency</MenuItem>
            <MenuItem value="FOLLOW_UP">Follow-up</MenuItem>
          </TextField>

          <TextField
            label="Reason for Visit"
            value={reasonForVisit}
            onChange={(event) =>
              setReasonForVisit(event.target.value)
            }
            slotProps={{
              htmlInput: { maxLength: 500 },
            }}
            fullWidth
          />

          <TextField
            label="Chief Complaint"
            value={chiefComplaint}
            onChange={(event) =>
              setChiefComplaint(event.target.value)
            }
            slotProps={{
              htmlInput: { maxLength: 1000 },
            }}
            multiline
            minRows={2}
            fullWidth
          />

          <Typography variant="caption" color="text.secondary">
            The encounter will start with IN_PROGRESS status.
            Its facility will be taken from your account assignment.
          </Typography>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {saving ? 'Creating...' : 'Start Patient Visit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
