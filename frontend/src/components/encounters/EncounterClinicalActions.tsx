import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  encountersApi,
  type CreateVitalsRequest,
  type VitalSignObservation,
  type EncounterDiagnosis,
} from '../../api/encounters.api';

type VitalField = keyof CreateVitalsRequest;

const vitalFields: Array<{
  key: VitalField;
  label: string;
  unit: string;
  min: number;
  max: number;
}> = [
  { key: 'systolicBloodPressure', label: 'Systolic BP', unit: 'mmHg', min: 20, max: 300 },
  { key: 'diastolicBloodPressure', label: 'Diastolic BP', unit: 'mmHg', min: 10, max: 200 },
  { key: 'pulseRate', label: 'Pulse', unit: 'beats/min', min: 20, max: 250 },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: 'breaths/min', min: 5, max: 100 },
  { key: 'temperature', label: 'Temperature', unit: 'C', min: 25, max: 45 },
  { key: 'oxygenSaturation', label: 'Oxygen saturation', unit: '%', min: 0, max: 100 },
  { key: 'weight', label: 'Weight', unit: 'kg', min: 0, max: 500 },
  { key: 'height', label: 'Height', unit: 'cm', min: 0, max: 300 },
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (Array.isArray(message)) return message.map(String).join(', ');
    if (typeof message === 'string') return message;

    if (error.response?.status === 401) {
      return 'Session expired. Sign in again.';
    }

    if (error.response?.status === 403) {
      return 'Permission denied.';
    }
  }

  return 'The operation failed. Please try again.';
}

interface Props {
  encounterId: string;
  encounterNumber: string;
  status: string;
  permissions: string[];
  onUpdated: () => void;
}

export default function EncounterClinicalActions({
  encounterId,
  encounterNumber,
  status,
  permissions,
  onUpdated,
}: Props) {
  const active = status === 'IN_PROGRESS';

  const canReadVitals = permissions.includes('vitals.read');
  const canCreateVitals = permissions.includes('vitals.create');
  const canReadDiagnoses = permissions.includes('diagnosis.read');
  const canCreateDiagnosis = permissions.includes('diagnosis.create');
  const canComplete = permissions.includes('encounter.update');

  const [vitals, setVitals] = useState<VitalSignObservation[]>([]);
  const [diagnoses, setDiagnoses] = useState<EncounterDiagnosis[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const [values, setValues] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [codeSystem, setCodeSystem] = useState('');
  const [diagnosisType, setDiagnosisType] = useState('');

  useEffect(() => {
    let current = true;

    async function load() {
      setLoading(true);

      try {
        const [vitalResult, diagnosisResult] = await Promise.all([
          canReadVitals
            ? encountersApi.getVitals(encounterId)
            : Promise.resolve([]),
          canReadDiagnoses
            ? encountersApi.getDiagnoses(encounterId)
            : Promise.resolve([]),
        ]);

        if (current) {
          setVitals(vitalResult);
          setDiagnoses(diagnosisResult);
        }
      } catch (err) {
        if (current) setError(errorMessage(err));
      } finally {
        if (current) setLoading(false);
      }
    }

    void load();

    return () => {
      current = false;
    };
  }, [encounterId, canReadVitals, canReadDiagnoses, refresh]);

  const vitalPayload: CreateVitalsRequest = {};
  let invalidVital = false;

  for (const field of vitalFields) {
    const raw = (values[field.key] ?? '').trim();

    if (!raw) continue;

    const numeric = Number(raw);

    if (
      !Number.isFinite(numeric) ||
      numeric < field.min ||
      numeric > field.max
    ) {
      invalidVital = true;
    } else {
      vitalPayload[field.key] = numeric;
    }
  }

  const canSaveVitals =
    !saving &&
    !invalidVital &&
    Object.keys(vitalPayload).length > 0;

  async function saveVitals() {
    if (!active || !canCreateVitals || !canSaveVitals) return;

    setSaving(true);
    setError(null);

    try {
      await encountersApi.createVitals(encounterId, vitalPayload);

      setVitalsOpen(false);
      setValues({});
      setNotice('Vital signs recorded successfully.');
      setRefresh((value) => value + 1);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveDiagnosis() {
    if (
      !active ||
      !canCreateDiagnosis ||
      saving ||
      !description.trim() ||
      description.trim().length > 1000
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await encountersApi.createDiagnosis(encounterId, {
        description: description.trim(),
        code: code.trim() || undefined,
        codeSystem: codeSystem.trim() || undefined,
        diagnosisType: diagnosisType.trim() || undefined,
      });

      setDiagnosisOpen(false);
      setDescription('');
      setCode('');
      setCodeSystem('');
      setDiagnosisType('');

      setNotice('Diagnosis added successfully.');
      setRefresh((value) => value + 1);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function completeEncounter() {
    if (!active || !canComplete || saving) return;

    setSaving(true);
    setError(null);

    try {
      await encountersApi.close(encounterId);

      setCompleteOpen(false);
      setNotice(`Encounter ${encounterNumber} completed.`);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Divider />

      <Typography variant="h6">
        Clinical Actions
      </Typography>

      {notice && <Alert severity="success">{notice}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {active && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {canCreateVitals && (
            <Button
              variant="outlined"
              onClick={() => {
                setError(null);
                setVitalsOpen(true);
              }}
            >
              Record Vitals
            </Button>
          )}

          {canCreateDiagnosis && (
            <Button
              variant="outlined"
              onClick={() => {
                setError(null);
                setDiagnosisOpen(true);
              }}
            >
              Add Diagnosis
            </Button>
          )}

          {canComplete && (
            <Button
              color="warning"
              variant="outlined"
              onClick={() => {
                setError(null);
                setCompleteOpen(true);
              }}
            >
              Complete Encounter
            </Button>
          )}
        </Stack>
      )}

      {!active && (
        <Alert severity="info">
          This encounter is not in progress. Clinical entry is disabled.
        </Alert>
      )}

      {loading && <CircularProgress size={24} />}

      {canReadVitals && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Vital Signs ({vitals.length})
          </Typography>

          {vitals.length === 0 && !loading && (
            <Typography variant="body2">
              No vital signs recorded.
            </Typography>
          )}

          {vitals.map((vital) => (
            <Typography key={vital.id} variant="body2">
              {vital.name}: {vital.valueNumeric ?? '-'} {vital.unit ?? ''}
            </Typography>
          ))}
        </Box>
      )}

      {canReadDiagnoses && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Diagnoses ({diagnoses.length})
          </Typography>

          {diagnoses.length === 0 && !loading && (
            <Typography variant="body2">
              No diagnoses recorded.
            </Typography>
          )}

          {diagnoses.map((diagnosis) => (
            <Typography key={diagnosis.id} variant="body2">
              {diagnosis.code ? `${diagnosis.code} - ` : ''}
              {diagnosis.description}
            </Typography>
          ))}
        </Box>
      )}

      <Dialog
        open={vitalsOpen}
        onClose={() => !saving && setVitalsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Vital Signs</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {vitalFields.map((field) => {
              const raw = values[field.key] ?? '';
              const numeric = Number(raw);

              const invalid =
                raw.trim() !== '' &&
                (
                  !Number.isFinite(numeric) ||
                  numeric < field.min ||
                  numeric > field.max
                );

              return (
                <TextField
                  key={field.key}
                  label={`${field.label} (${field.unit})`}
                  type="number"
                  value={raw}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      [field.key]: event.target.value,
                    }))
                  }
                  error={invalid}
                  helperText={
                    invalid
                      ? `Allowed range: ${field.min} to ${field.max}`
                      : ''
                  }
                  slotProps={{
                    htmlInput: {
                      min: field.min,
                      max: field.max,
                      step: 'any',
                    },
                  }}
                  fullWidth
                />
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => setVitalsOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={!canSaveVitals}
            onClick={() => void saveVitals()}
          >
            {saving ? 'Saving...' : 'Save Vitals'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={diagnosisOpen}
        onClose={() => !saving && setDiagnosisOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Diagnosis</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Diagnosis description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              multiline
              minRows={2}
              slotProps={{
                htmlInput: { maxLength: 1000 },
              }}
            />

            <TextField
              label="Code (optional)"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />

            <TextField
              label="Code system (optional)"
              value={codeSystem}
              onChange={(event) => setCodeSystem(event.target.value)}
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />

            <TextField
              label="Diagnosis type (optional)"
              value={diagnosisType}
              onChange={(event) => setDiagnosisType(event.target.value)}
              slotProps={{
                htmlInput: { maxLength: 50 },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => setDiagnosisOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              saving ||
              !description.trim() ||
              description.trim().length > 1000
            }
            onClick={() => void saveDiagnosis()}
          >
            {saving ? 'Saving...' : 'Add Diagnosis'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={completeOpen}
        onClose={() => !saving && setCompleteOpen(false)}
      >
        <DialogTitle>Complete Encounter?</DialogTitle>

        <DialogContent>
          <Typography>
            Complete encounter {encounterNumber}? New vital signs and
            diagnoses cannot be added after completion.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => setCompleteOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="warning"
            disabled={saving}
            onClick={() => void completeEncounter()}
          >
            {saving ? 'Completing...' : 'Confirm Completion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}