import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import DeleteOutlineIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

import { useAuth } from '../../auth/AuthContext';
import { encountersApi, type Encounter } from '../../api/encounters.api';
import {
  laboratoryApi,
  type CreateLaboratoryOrderItem,
  type LaboratoryOrder,
} from '../../api/laboratory.api';
import type { Patient } from '../../types/patient';

interface Props {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onCreated: (order: LaboratoryOrder) => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (error.response?.status === 403) {
      return 'You do not have permission to create this laboratory order.';
    }

    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return 'Unable to create laboratory order.';
}

const emptyTest = (): CreateLaboratoryOrderItem => ({
  testName: '',
  testCode: '',
  codeSystem: '',
  specimenType: '',
});

export default function CreateLaboratoryOrderDialog({
  open,
  patient,
  onClose,
  onCreated,
}: Props) {
  const { user } = useAuth();

  const canOrder = user?.permissions.includes('lab.order') ?? false;
  const canReadEncounters =
    user?.permissions.includes('encounter.read') ?? false;

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encounterId, setEncounterId] = useState('');
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [tests, setTests] = useState<CreateLaboratoryOrderItem[]>([
    emptyTest(),
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patient || !canOrder || !canReadEncounters) return;

    let active = true;

    async function loadEncounters() {
      setLoading(true);
      setError(null);
      setEncounters([]);
      setEncounterId('');

      try {
        const response = await encountersApi.list({
          patientId: patient!.id,
          status: 'IN_PROGRESS',
          page: 1,
          limit: 100,
        });

        if (active) {
          setEncounters(
            response.items.filter(
              (encounter) =>
                encounter.patientId === patient!.id &&
                encounter.status === 'IN_PROGRESS',
            ),
          );
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEncounters();

    return () => {
      active = false;
    };
  }, [open, patient, canOrder, canReadEncounters]);

  function updateTest(
    index: number,
    field: keyof CreateLaboratoryOrderItem,
    value: string,
  ) {
    setTests((current) =>
      current.map((test, testIndex) =>
        testIndex === index ? { ...test, [field]: value } : test,
      ),
    );
  }

  function removeTest(index: number) {
    setTests((current) =>
      current.length === 1
        ? current
        : current.filter((_, testIndex) => testIndex !== index),
    );
  }

  async function handleSubmit() {
    if (!patient || !canOrder || !encounterId || saving) return;

    const cleanedTests = tests.map((test) => ({
      testName: test.testName.trim(),
      testCode: test.testCode?.trim() || undefined,
      codeSystem: test.codeSystem?.trim() || undefined,
      specimenType: test.specimenType?.trim() || undefined,
    }));

    if (cleanedTests.some((test) => !test.testName)) {
      setError('Every laboratory test must have a name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const order = await laboratoryApi.createOrder(encounterId, {
        priority,
        clinicalInfo: clinicalInfo.trim() || undefined,
        items: cleanedTests,
      });

      onCreated(order);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    canOrder &&
    canReadEncounters &&
    !!encounterId &&
    tests.length > 0 &&
    tests.every((test) => !!test.testName.trim()) &&
    !loading &&
    !saving;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose}
      fullWidth maxWidth="md">
      <DialogTitle>Create Laboratory Order</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {patient && (
            <Typography>
              Patient: {patient.patientNumber} —{' '}
              {[patient.firstName, patient.middleName, patient.lastName]
                .filter(Boolean)
                .join(' ')}
            </Typography>
          )}

          {!canOrder && (
            <Alert severity="warning">
              Your account does not have lab.order permission.
            </Alert>
          )}

          {!canReadEncounters && (
            <Alert severity="warning">
              Encounter read permission is required to select an encounter.
            </Alert>
          )}

          {loading && <CircularProgress size={24} />}

          {canReadEncounters && !loading && encounters.length === 0 && (
            <Alert severity="info">
              No active encounter was found for this patient.
              Start an encounter before creating a laboratory order.
            </Alert>
          )}

          <TextField
            select
            fullWidth
            label="Active Encounter"
            value={encounterId}
            onChange={(event) => setEncounterId(event.target.value)}
            disabled={loading || !canOrder || !canReadEncounters}
          >
            {encounters.map((encounter) => (
              <MenuItem key={encounter.id} value={encounter.id}>
                {encounter.encounterNumber} — {encounter.encounterType}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <MenuItem value="ROUTINE">Routine</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
            <MenuItem value="STAT">STAT</MenuItem>
          </TextField>

          <TextField
            label="Clinical Information"
            multiline
            minRows={2}
            value={clinicalInfo}
            onChange={(event) => setClinicalInfo(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />

          <Typography variant="h6">Laboratory Tests</Typography>

          {tests.map((test, index) => (
            <Box key={index}
              sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography>Test {index + 1}</Typography>

                  <IconButton
                    aria-label={`Remove test ${index + 1}`}
                    disabled={tests.length === 1}
                    onClick={() => removeTest(index)}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>

                <TextField
                  label="Test Name"
                  required
                  value={test.testName}
                  onChange={(event) =>
                    updateTest(index, 'testName', event.target.value)
                  }
                  slotProps={{ htmlInput: { maxLength: 255 } }}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Test Code"
                    fullWidth
                    value={test.testCode ?? ''}
                    onChange={(event) =>
                      updateTest(index, 'testCode', event.target.value)
                    }
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />

                  <TextField
                    label="Code System"
                    fullWidth
                    value={test.codeSystem ?? ''}
                    onChange={(event) =>
                      updateTest(index, 'codeSystem', event.target.value)
                    }
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />

                  <TextField
                    label="Specimen Type"
                    fullWidth
                    value={test.specimenType ?? ''}
                    onChange={(event) =>
                      updateTest(index, 'specimenType', event.target.value)
                    }
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                </Stack>
              </Stack>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={() => setTests((current) => [...current, emptyTest()])}
          >
            Add Another Test
          </Button>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
        >
          {saving ? 'Creating...' : 'Create Laboratory Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
