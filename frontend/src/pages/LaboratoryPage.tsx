import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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

import { useAuth } from '../auth/AuthContext';
import LaboratoryPatientSearch from '../components/laboratory/LaboratoryPatientSearch';
import CreateLaboratoryOrderDialog from '../components/laboratory/CreateLaboratoryOrderDialog';
import LaboratoryResultActions from '../components/laboratory/LaboratoryResultActions';
import type { Patient } from '../types/patient';
import {
  laboratoryApi,
  type LaboratoryOrder,
} from '../api/laboratory.api';

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to view laboratory orders.';
    }

    if (error.response?.status === 404) {
      return 'Laboratory order or patient not found.';
    }

    const message = error.response?.data?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }
  }

  return 'Unable to retrieve laboratory information.';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString();
}

function statusColor(
  status: string,
): 'default' | 'success' | 'warning' | 'info' {
  if (status === 'COMPLETED' || status === 'FINAL') {
    return 'success';
  }

  if (status === 'IN_PROGRESS' || status === 'PRELIMINARY') {
    return 'warning';
  }

  if (status === 'ORDERED') {
    return 'info';
  }

  return 'default';
}

export default function LaboratoryPage() {
  const { user } = useAuth();

  const canRead =
    user?.permissions.includes('lab.read') ?? false;

  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] =
    useState<Patient | null>(null);
  const [orderId, setOrderId] = useState('');
  const canOrder =
    user?.permissions.includes('lab.order') ?? false;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [orders, setOrders] = useState<LaboratoryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<LaboratoryOrder | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleOrderCreated(order: LaboratoryOrder) {
    setCreateDialogOpen(false);
    setSuccessMessage(
      `Laboratory order ${order.orderNumber} created successfully.`,
    );

    setError(null);
    setSearched(true);
    setSelectedOrder(null);

    if (!selectedPatient) return;

    setLoading(true);

    try {
      const result = await laboratoryApi.getPatientOrders(
        selectedPatient.id,
      );

      setOrders(result);

      const createdOrder = result.find(
        (item) => item.id === order.id,
      );

      if (createdOrder) {
        setSelectedOrder(createdOrder);
      }
    } catch (err) {
      setError(
        'Order was created, but the laboratory list could not be refreshed. ' +
        errorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }
  async function handleSelectPatient(patient: Patient) {
    if (!canRead) return;

    setSelectedPatient(patient);
    setPatientId(patient.id);
    setOrderId('');

    setLoading(true);
    setError(null);
    setSearched(true);
    setOrders([]);
    setSelectedOrder(null);

    try {
      const result = await laboratoryApi.getPatientOrders(patient.id);
      setOrders(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  async function loadPatientOrders() {
    const id = patientId.trim();

    if (!id || !canRead) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setOrders([]);
    setSelectedOrder(null);

    try {
      const result = await laboratoryApi.getPatientOrders(id);
      setOrders(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadOrder() {
    const id = orderId.trim();

    if (!id || !canRead) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setOrders([]);
    setSelectedOrder(null);

    try {
      const result = await laboratoryApi.getOrder(id);
      setSelectedOrder(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Laboratory Management
        </Typography>

        <Typography color="text.secondary">
          Review laboratory orders, tests, and results.
        </Typography>
      </Box>

      {!canRead ? (
        <Alert severity="warning">
          Your account does not have laboratory read permission.
        </Alert>
      ) : (
        <>
          {selectedPatient && canOrder && (
            <Box>
              <Button
                variant="contained"
                onClick={() => {
                  setSuccessMessage(null);
                  setCreateDialogOpen(true);
                }}
              >
                Create Laboratory Order
              </Button>
            </Box>
          )}

          {successMessage && (
            <Alert severity="success">
              {successMessage}
            </Alert>
          )}

          <CreateLaboratoryOrderDialog
            open={createDialogOpen}
            patient={selectedPatient}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={(order) => {
              void handleOrderCreated(order);
            }}
          />
          <LaboratoryPatientSearch
            onSelectPatient={(patient) => {
              void handleSelectPatient(patient);
            }}
          />

          {selectedPatient && (
            <Alert severity="success">
              Selected patient: {selectedPatient.patientNumber} —{' '}
              {[
                selectedPatient.firstName,
                selectedPatient.middleName,
                selectedPatient.lastName,
              ].filter(Boolean).join(' ')}
            </Alert>
          )}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Find Laboratory Orders
            </Typography>

            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
              >
                <TextField
                  label="Patient ID"
                  value={patientId}
                  onChange={(event) =>
                    setPatientId(event.target.value)
                  }
                  fullWidth
                  size="small"
                />

                <Button
                  variant="contained"
                  onClick={loadPatientOrders}
                  disabled={loading || !patientId.trim()}
                >
                  Find Patient Orders
                </Button>
              </Stack>

              <Divider>OR</Divider>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
              >
                <TextField
                  label="Laboratory Order ID"
                  value={orderId}
                  onChange={(event) =>
                    setOrderId(event.target.value)
                  }
                  fullWidth
                  size="small"
                />

                <Button
                  variant="outlined"
                  onClick={loadOrder}
                  disabled={loading || !orderId.trim()}
                >
                  Find Order
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && searched && !error &&
            orders.length === 0 && !selectedOrder && (
              <Alert severity="info">
                No laboratory orders were found.
              </Alert>
            )}

          {orders.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Patient Laboratory Orders
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order Number</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ordered At</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell>{order.priority}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={statusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {formatDate(order.orderedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View Tests
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {selectedOrder && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order: {selectedOrder.orderNumber}
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography>
                  Priority: {selectedOrder.priority}
                </Typography>

                <Typography>
                  Status: {selectedOrder.status}
                </Typography>

                <Typography>
                  Clinical Information:{' '}
                  {selectedOrder.clinicalInfo || '-'}
                </Typography>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Test</TableCell>
                      <TableCell>Specimen</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Result</TableCell>
                      <TableCell>Verification</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.testName}</TableCell>
                        <TableCell>
                          {item.specimenType || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            color={statusColor(item.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {item.result?.valueText ??
                            item.result?.valueNumeric ??
                            '-'}
                          {item.result?.unit
                            ? ` ${item.result.unit}`
                            : ''}
                        </TableCell>
                        <TableCell>
                          {item.result?.verifiedAt
                            ? `Verified ${formatDate(
                                item.result.verifiedAt,
                              )}`
                            : item.result
                              ? 'Not verified'
                              : 'No result'}
                        </TableCell>
                      <TableCell>
                          <LaboratoryResultActions
                            orderId={selectedOrder.id}
                            item={item}
                            permissions={user?.permissions ?? []}
                            onUpdated={async () => {
                              const fresh = await laboratoryApi.getOrder(selectedOrder.id);
                              setSelectedOrder(fresh);
                              setOrders(previous =>
                                previous.map(order =>
                                  order.id === fresh.id ? fresh : order
                                )
                              );
                            }}
                          />
                        </TableCell>
</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}
