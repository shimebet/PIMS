import { useState } from 'react';
import axios from 'axios';
import {
  Alert, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import {
  laboratoryApi,
  type LaboratoryOrderItem,
  type CreatePreliminaryResultRequest,
} from '../../api/laboratory.api';

interface Props {
  orderId: string;
  item: LaboratoryOrderItem;
  permissions: string[];
  onUpdated: () => Promise<void>;
}

function getError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.map(String).join(', ');
    if (typeof message === 'string') return message;
    if (error.response?.status === 403) return 'Permission denied.';
    if (error.response?.status === 401) return 'Please sign in again.';
  }
  return 'The laboratory operation failed.';
}

export default function LaboratoryResultActions({
  orderId, item, permissions, onUpdated,
}: Props) {
  const canResult = permissions.includes('lab.result');
  const canVerify = permissions.includes('lab.verify');

  const hasResult = Boolean(item.result);
  const verified = Boolean(item.result?.verifiedAt) ||
    item.result?.status === 'FINAL';

  const [resultOpen, setResultOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [numeric, setNumeric] = useState('');
  const [text, setText] = useState('');
  const [unit, setUnit] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [flag, setFlag] = useState('');

  const numberValid = (value: string) =>
    !value.trim() || Number.isFinite(Number(value));

  const valid =
    (numeric.trim() !== '' || text.trim() !== '') &&
    [numeric, low, high].every(numberValid) &&
    (low.trim() === '' || high.trim() === '' ||
      Number(low) <= Number(high)) &&
    text.length <= 2000 &&
    unit.length <= 50 &&
    flag.length <= 50;

  async function saveResult() {
    if (!canResult || hasResult || !valid || saving) return;

    const data: CreatePreliminaryResultRequest = {
      status: 'PRELIMINARY',
      valueNumeric: numeric.trim() ? Number(numeric) : undefined,
      valueText: text.trim() || undefined,
      unit: unit.trim() || undefined,
      referenceRangeLow: low.trim() ? Number(low) : undefined,
      referenceRangeHigh: high.trim() ? Number(high) : undefined,
      abnormalFlag: flag.trim() || undefined,
    };

    setSaving(true);
    setError(null);

    try {
      await laboratoryApi.createPreliminaryResult(orderId, item.id, data);
      setResultOpen(false);
      await onUpdated();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    if (!canVerify || !hasResult || verified || saving) return;

    setSaving(true);
    setError(null);

    try {
      await laboratoryApi.verifyResult(orderId, item.id);
      setVerifyOpen(false);
      await onUpdated();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {canResult && !hasResult && (
          <Button size="small" variant="outlined"
            onClick={() => { setError(null); setResultOpen(true); }}>
            Record Result
          </Button>
        )}

        {canVerify && hasResult && !verified && (
          <Button size="small" color="success" variant="outlined"
            onClick={() => { setError(null); setVerifyOpen(true); }}>
            Verify Result
          </Button>
        )}

        {verified && (
          <Typography variant="caption" color="success.main">
            Verified
          </Typography>
        )}
      </Stack>

      <Dialog open={resultOpen}
        onClose={() => { if (!saving) setResultOpen(false); }}
        fullWidth maxWidth="sm">
        <DialogTitle>Record Preliminary Result</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{item.testName}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Numeric result" type="number"
              value={numeric} onChange={e => setNumeric(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }} />
            <TextField label="Text result" multiline minRows={2}
              value={text} onChange={e => setText(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }} />
            <TextField label="Unit" value={unit}
              onChange={e => setUnit(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }} />
            <TextField label="Reference range low" type="number"
              value={low} onChange={e => setLow(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }} />
            <TextField label="Reference range high" type="number"
              value={high} onChange={e => setHigh(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }} />
            <TextField label="Abnormal flag (optional)" value={flag}
              onChange={e => setFlag(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 50 } }} />
            <Alert severity="info">
              Results are saved as PRELIMINARY. Verification is a separate action.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setResultOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!valid || saving}
            onClick={() => void saveResult()}>
            {saving ? 'Saving...' : 'Save Preliminary Result'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={verifyOpen}
        onClose={() => { if (!saving) setVerifyOpen(false); }}>
        <DialogTitle>Verify Laboratory Result</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Verify the result for {item.testName}?
              Confirm that the reported result has been reviewed and is correct.
            </Typography>
            <Typography variant="body2">
              Result: {item.result?.valueText ??
                item.result?.valueNumeric ?? '-'} {item.result?.unit ?? ''}
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setVerifyOpen(false)}>
            Cancel
          </Button>
          <Button color="success" variant="contained" disabled={saving}
            onClick={() => void verify()}>
            {saving ? 'Verifying...' : 'Confirm Verification'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}