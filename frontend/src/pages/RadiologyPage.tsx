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
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '../auth/AuthContext';
import LaboratoryPatientSearch from '../components/laboratory/LaboratoryPatientSearch';
import { encountersApi, type Encounter } from '../api/encounters.api';
import {
  radiologyApi,
  type RadiologyOrder,
} from '../api/radiology.api';
import type { Patient } from '../types/patient';

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission for this operation.';
    }
  }

  return 'The operation failed. Please try again.';
}

function fullName(patient: Patient): string {
  return [
    patient.firstName,
    patient.middleName,
    patient.lastName,
  ].filter(Boolean).join(' ');
}

export default function RadiologyPage() {
  const { user } = useAuth();

  const permissions = user?.permissions ?? [];
  const canRead = permissions.includes('radiology.read');
  const canOrder = permissions.includes('radiology.order');
  const canResult = permissions.includes('radiology.result');
  const canReadEncounters = permissions.includes('encounter.read');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<RadiologyOrder[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [orderOpen, setOrderOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const [encounterId, setEncounterId] = useState('');
  const [modality, setModality] = useState('X-RAY');
  const [bodySite, setBodySite] = useState('');
  const [studyDescription, setStudyDescription] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [priority, setPriority] = useState('ROUTINE');

  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  useEffect(() => {
    if (!patient || !canRead) {
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await radiologyApi.getPatientOrders(patient!.id);
        if (!cancelled) setOrders(result);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [patient, canRead]);

  useEffect(() => {
    if (!patient || !canOrder || !canReadEncounters) {
      setEncounters([]);
      return;
    }

    let cancelled = false;

    async function loadEncounters() {
      try {
        const response = await encountersApi.list({
          patientId: patient!.id,
          status: 'IN_PROGRESS',
          limit: 100,
        });

        if (!cancelled) {
          const eligible = response.items.filter(
            item =>
              item.patientId === patient!.id &&
              item.status === 'IN_PROGRESS'
          );

          setEncounters(eligible);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    }

    void loadEncounters();

    return () => {
      cancelled = true;
    };
  }, [patient, canOrder, canReadEncounters, user?.facilityId]);

  async function refreshOrders() {
    if (!patient) return;

    const result = await radiologyApi.getPatientOrders(patient.id);
    setOrders(result);
  }

  async function openDetails(id: string) {
    setLoading(true);
    setError(null);

    try {
      const order = await radiologyApi.getOrder(id);
      setSelectedOrder(order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function createOrder() {
    if (
      !canOrder ||
      !encounters.some(e => e.id === encounterId) ||
      !modality.trim() ||
      !studyDescription.trim() ||
      saving
    ) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await radiologyApi.createOrder(encounterId, {
        modality: modality.trim(),
        bodySite: bodySite.trim() || undefined,
        studyDescription: studyDescription.trim(),
        clinicalIndication: clinicalIndication.trim() || undefined,
        priority,
      });

      setOrderOpen(false);
      setStudyDescription('');
      setBodySite('');
      setClinicalIndication('');
      setEncounterId('');

      await refreshOrders();
      setSuccess('Radiology order created successfully.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function createResult() {
    if (
      !selectedOrder ||
      !canResult ||
      selectedOrder.result ||
      (!findings.trim() && !impression.trim()) ||
      saving
    ) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await radiologyApi.createResult(selectedOrder.id, {
        findings: findings.trim() || undefined,
        impression: impression.trim() || undefined,
      });

      const fresh = await radiologyApi.getOrder(selectedOrder.id);
      setSelectedOrder(fresh);
      await refreshOrders();

      setResultOpen(false);
      setFindings('');
      setImpression('');
      setSuccess('Radiology result recorded successfully.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return (
      <Alert severity="warning">
        Your account does not have radiology.read permission.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Radiology Management
        </Typography>
        <Typography color="text.secondary">
          Wan Offi Clinic — radiology orders and reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <LaboratoryPatientSearch
        onSelectPatient={selected => {
          setPatient(selected);
          setSelectedOrder(null);
          setEncounterId('');
          setError(null);
          setSuccess(null);
        }}
      />

      {patient && (
        <>
          <Alert severity="success">
            Selected patient: {patient.patientNumber} — {fullName(patient)}
          </Alert>

          {canOrder && (
            <Box>
              <Button
                variant="contained"
                disabled={!canReadEncounters || encounters.length === 0}
                onClick={() => setOrderOpen(true)}
              >
                Create Radiology Order
              </Button>

              {!canReadEncounters && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Encounter read permission is required to select an encounter.
                </Alert>
              )}

              {canReadEncounters && encounters.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No eligible active encounters are currently available.
                </Alert>
              )}
            </Box>
          )}

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Patient Radiology Orders
            </Typography>

            {loading && <CircularProgress size={24} />}

            {!loading && orders.length === 0 && (
              <Typography color="text.secondary">
                No radiology orders found for this patient.
              </Typography>
            )}

            {orders.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Modality</TableCell>
                    <TableCell>Study</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNumber ?? order.id}</TableCell>
                      <TableCell>{order.modality}</TableCell>
                      <TableCell>{order.studyDescription}</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => void openDetails(order.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      {selectedOrder && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">
              Radiology Order Details
            </Typography>

            <Typography>
              <strong>Order:</strong> {selectedOrder.orderNumber ?? selectedOrder.id}
            </Typography>
            <Typography>
              <strong>Modality:</strong> {selectedOrder.modality}
            </Typography>
            <Typography>
              <strong>Body Site:</strong> {selectedOrder.bodySite || '-'}
            </Typography>
            <Typography>
              <strong>Study:</strong> {selectedOrder.studyDescription}
            </Typography>
            <Typography>
              <strong>Clinical Indication:</strong> {selectedOrder.clinicalIndication || '-'}
            </Typography>
            <Typography>
              <strong>Priority:</strong> {selectedOrder.priority || '-'}
            </Typography>
            <Typography>
              <strong>Status:</strong> {selectedOrder.status}
            </Typography>

            <Typography variant="h6">Radiology Report</Typography>

            {selectedOrder.result ? (
              <>
                <Typography>
                  <strong>Findings:</strong> {selectedOrder.result.findings || '-'}
                </Typography>
                <Typography>
                  <strong>Impression:</strong> {selectedOrder.result.impression || '-'}
                </Typography>
                <Typography>
                  <strong>Report Status:</strong> {selectedOrder.result.status || '-'}
                </Typography>
              </>
            ) : (
              <>
                <Alert severity="info">
                  No radiology result has been recorded.
                </Alert>

                {canResult && (
                  <Button
                    variant="outlined"
                    onClick={() => setResultOpen(true)}
                  >
                    Record Radiology Result
                  </Button>
                )}
              </>
            )}

            <Button onClick={() => setSelectedOrder(null)}>
              Close Details
            </Button>
          </Stack>
        </Paper>
      )}

      <Dialog
        open={orderOpen}
        onClose={() => { if (!saving) setOrderOpen(false); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Radiology Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Active Encounter"
              value={encounterId}
              onChange={e => setEncounterId(e.target.value)}
              required
            >
              {encounters.map(encounter => (
                <MenuItem key={encounter.id} value={encounter.id}>
                  {encounter.encounterNumber} — {encounter.encounterType}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Modality"
              value={modality}
              onChange={e => setModality(e.target.value)}
            >
              {['X-RAY', 'ULTRASOUND', 'CT', 'MRI', 'OTHER'].map(value => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Body Site"
              value={bodySite}
              onChange={e => setBodySite(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />

            <TextField
              label="Study Description"
              required
              multiline
              minRows={2}
              value={studyDescription}
              onChange={e => setStudyDescription(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <TextField
              label="Clinical Indication"
              multiline
              minRows={2}
              value={clinicalIndication}
              onChange={e => setClinicalIndication(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />

            <TextField
              select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {['ROUTINE', 'URGENT', 'STAT'].map(value => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => setOrderOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              !encounterId ||
              !studyDescription.trim() ||
              !modality.trim()
            }
            onClick={() => void createOrder()}
          >
            {saving ? 'Saving...' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resultOpen}
        onClose={() => { if (!saving) setResultOpen(false); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Radiology Result</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Findings"
              multiline
              minRows={4}
              value={findings}
              onChange={e => setFindings(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
            />

            <TextField
              label="Impression"
              multiline
              minRows={3}
              value={impression}
              onChange={e => setImpression(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
            />

            <Alert severity="warning">
              Submit only reviewed findings for the correct patient and order.
              This action creates a clinical record.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => setResultOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              saving ||
              (!findings.trim() && !impression.trim())
            }
            onClick={() => void createResult()}
          >
            {saving ? 'Saving...' : 'Save Result'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}