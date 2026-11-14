import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { patientsApi } from '../api/patients.api';
import {
  encountersApi,
  type Encounter,
  type VitalSignObservation,
  type EncounterDiagnosis,
} from '../api/encounters.api';

import type { Patient } from '../types/patient';

import {
  clinicalRecordsApi,
  type ClinicalNote,
  type PatientAllergy,
  type MedicationOrder,
} from '../api/clinical-records.api';

import {
  laboratoryApi,
  type LaboratoryOrder,
} from '../api/laboratory.api';

import {
  radiologyApi,
  type RadiologyOrder,
} from '../api/radiology.api';
type PatientOption = Patient;

function patientName(patient: PatientOption): string {
  return [
    patient.firstName,
    patient.middleName,
    patient.lastName,
  ].filter(Boolean).join(' ');
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not recorded';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

export default function ClinicalRecordsPage() {
  // Ignore responses from previously selected patients or encounters.
  const patientRequestId = useRef(0);
  const encounterRequestId = useRef(0);

  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientOption | null>(null);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] =
    useState<Encounter | null>(null);

  const [vitals, setVitals] = useState<VitalSignObservation[]>([]);
  const [diagnoses, setDiagnoses] = useState<EncounterDiagnosis[]>([]);

  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [medications, setMedications] = useState<MedicationOrder[]>([]);

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [clinicalWarnings, setClinicalWarnings] = useState<string[]>([]);

  const [labOrders, setLabOrders] = useState<LaboratoryOrder[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([]);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsErrors, setDiagnosticsErrors] = useState<string[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  async function loadPatients() {
    setLoadingPatients(true);
    setError('');

    try {
      const response = await patientsApi.list({
        page: 1,
        limit: 50,
      });

      setPatients(response.items);
    } catch {
      setError('Unable to load patients.');
    } finally {
      setLoadingPatients(false);
    }
  }

  useEffect(() => {
    void loadPatients();
  }, []);

  async function selectPatient(patient: PatientOption) {
    const requestId = ++patientRequestId.current;

    // Invalidate all outstanding encounter requests.
    ++encounterRequestId.current;

    setSelectedPatient(patient);
    setSelectedEncounter(null);

    setEncounters([]);
    setVitals([]);
    setDiagnoses([]);
    setNotes([]);
    setAllergies([]);
    setMedications([]);
    setClinicalWarnings([]);
    setLabOrders([]);
    setRadiologyOrders([]);
    setDiagnosticsErrors([]);
    setDiagnosticsLoading(true);

    setLoadingEncounters(true);
    setLoadingHistory(true);
    setLoadingDetails(false);
    setLoadingNotes(false);
    setError('');

    void Promise.allSettled([
      clinicalRecordsApi.getAllergies(patient.id),
      clinicalRecordsApi.getPatientMedications(patient.id),
    ]).then((results) => {
      if (patientRequestId.current !== requestId) return;

      const warnings: string[] = [];

      if (results[0].status === 'fulfilled') {
        setAllergies(results[0].value);
      } else {
        warnings.push('Allergy records could not be loaded.');
      }

      if (results[1].status === 'fulfilled') {
        setMedications(results[1].value);
      } else {
        warnings.push('Medication history could not be loaded.');
      }

      setClinicalWarnings(warnings);
    }).finally(() => {
      if (patientRequestId.current === requestId) {
        setLoadingHistory(false);
      }
    });

    void Promise.allSettled([
      laboratoryApi.getPatientOrders(patient.id),
      radiologyApi.getPatientOrders(patient.id),
    ]).then((results) => {
      if (patientRequestId.current !== requestId) return;

      const warnings: string[] = [];

      if (results[0].status === 'fulfilled') {
        setLabOrders(results[0].value);
      } else {
        warnings.push('Laboratory history could not be loaded.');
      }

      if (results[1].status === 'fulfilled') {
        setRadiologyOrders(results[1].value);
      } else {
        warnings.push('Radiology history could not be loaded.');
      }

      setDiagnosticsErrors(warnings);
    }).finally(() => {
      if (patientRequestId.current === requestId) {
        setDiagnosticsLoading(false);
      }
    });
    try {
      const response = await encountersApi.list({
        patientId: patient.id,
        page: 1,
        limit: 100,
      });

      if (patientRequestId.current !== requestId) return;

      setEncounters(response.items);
    } catch {
      if (patientRequestId.current === requestId) {
        setError('Unable to load patient encounters.');
      }
    } finally {
      if (patientRequestId.current === requestId) {
        setLoadingEncounters(false);
      }
    }
  }

  async function selectEncounter(encounter: Encounter) {
    const requestId = ++encounterRequestId.current;
    const currentPatientRequestId = patientRequestId.current;

    setSelectedEncounter(encounter);
    setVitals([]);
    setDiagnoses([]);
    setNotes([]);

    setLoadingDetails(true);
    setLoadingNotes(true);
    setError('');

    setClinicalWarnings((previous) =>
      previous.filter(
        (message) => message !== 'Clinical notes could not be loaded.',
      ),
    );

    void clinicalRecordsApi.getNotes(encounter.id)
      .then((results) => {
        if (
          encounterRequestId.current !== requestId ||
          patientRequestId.current !== currentPatientRequestId
        ) return;

        setNotes(results);
      })
      .catch(() => {
        if (
          encounterRequestId.current !== requestId ||
          patientRequestId.current !== currentPatientRequestId
        ) return;

        setClinicalWarnings((previous) => [
          ...previous.filter(
            (message) => message !== 'Clinical notes could not be loaded.',
          ),
          'Clinical notes could not be loaded.',
        ]);
      })
      .finally(() => {
        if (
          encounterRequestId.current === requestId &&
          patientRequestId.current === currentPatientRequestId
        ) {
          setLoadingNotes(false);
        }
      });

    try {
      const [vitalResults, diagnosisResults] = await Promise.all([
        encountersApi.getVitals(encounter.id),
        encountersApi.getDiagnoses(encounter.id),
      ]);

      if (
        encounterRequestId.current !== requestId ||
        patientRequestId.current !== currentPatientRequestId
      ) return;

      setVitals(vitalResults);
      setDiagnoses(diagnosisResults);
    } catch {
      if (
        encounterRequestId.current === requestId &&
        patientRequestId.current === currentPatientRequestId
      ) {
        setError('Unable to load encounter clinical details.');
      }
    } finally {
      if (
        encounterRequestId.current === requestId &&
        patientRequestId.current === currentPatientRequestId
      ) {
        setLoadingDetails(false);
      }
    }
  }

  const filteredPatients = patients.filter((patient) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return (
      patientName(patient).toLowerCase().includes(term) ||
      String(patient.patientNumber ?? '')
        .toLowerCase()
        .includes(term)
    );
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Clinical Records
          </Typography>
          <Typography color="text.secondary">
            Patient-centered clinical history and encounter records
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {clinicalWarnings.map((warning) => (
          <Alert key={warning} severity="warning">
            {warning}
          </Alert>
        ))}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">
                    Patient Search
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    label="Search name or patient number"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  <Button
                    variant="outlined"
                    onClick={() => void loadPatients()}
                    disabled={loadingPatients}
                  >
                    Refresh Patients
                  </Button>

                  {loadingPatients && <CircularProgress size={24} />}

                  <Stack spacing={1}>
                    {filteredPatients.map((patient) => (
                      <Button
                        key={patient.id}
                        variant={
                          selectedPatient?.id === patient.id
                            ? 'contained'
                            : 'outlined'
                        }
                        onClick={() => void selectPatient(patient)}
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                        }}
                      >
                        {patientName(patient)}
                        {' — '}
                        {patient.patientNumber}
                      </Button>
                    ))}
                  </Stack>

                  {!loadingPatients && filteredPatients.length === 0 && (
                    <Typography color="text.secondary">
                      No matching patients found.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Patient Clinical Profile
                  </Typography>

                  {!selectedPatient ? (
                    <Typography color="text.secondary">
                      Select a patient to view clinical records.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {patientName(selectedPatient)}
                      </Typography>

                      <Typography>
                        Patient Number: {selectedPatient.patientNumber}
                      </Typography>

                      <Typography>
                        Gender: {selectedPatient.gender ?? 'Not recorded'}
                      </Typography>

                      <Typography>
                        Date of Birth: {
                          selectedPatient.dateOfBirth?.slice(0, 10) ?? 'Not recorded'
                        }
                      </Typography>
                    </Stack>
                  )}
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Encounter History
                  </Typography>

                  {loadingEncounters && <CircularProgress size={24} />}

                  {!loadingEncounters && selectedPatient &&
                    encounters.length === 0 && (
                      <Typography color="text.secondary">
                        No encounters found for this patient.
                      </Typography>
                    )}

                  <Stack spacing={1}>
                    {encounters.map((encounter) => (
                      <Button
                        key={encounter.id}
                        variant={
                          selectedEncounter?.id === encounter.id
                            ? 'contained'
                            : 'outlined'
                        }
                        onClick={() => void selectEncounter(encounter)}
                        sx={{ justifyContent: 'space-between' }}
                      >
                        <span>
                          {encounter.encounterNumber}
                          {' — '}
                          {formatDate(encounter.startedAt)}
                        </span>
                        <Chip
                          size="small"
                          label={encounter.status}
                          color="default"
                        />
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              {selectedPatient && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">
                        Allergies and Medication History
                      </Typography>

                      {loadingHistory && <CircularProgress size={24} />}

                      <Typography sx={{ fontWeight: 600 }}>
                        Patient Allergies
                      </Typography>

                      {!loadingHistory && allergies.length === 0 && (
                        <Typography color="text.secondary">
                          No allergy records returned. Allergy status is not confirmed.
                        </Typography>
                      )}

                      {allergies.map((allergy) => (
                        <Box key={allergy.id}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {allergy.substance}
                          </Typography>
                          <Typography variant="body2">
                            Reaction: {allergy.reaction ?? 'Not recorded'}
                          </Typography>
                          <Typography variant="body2">
                            Severity: {allergy.severity ?? 'Not recorded'}
                          </Typography>
                          <Typography variant="body2">
                            Criticality: {allergy.criticality ?? 'Not recorded'}
                          </Typography>
                        </Box>
                      ))}

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Medication History
                      </Typography>

                      {!loadingHistory && medications.length === 0 && (
                        <Typography color="text.secondary">
                          No medication orders returned.
                        </Typography>
                      )}

                      {medications.map((medication) => (
                        <Box key={medication.id}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {medication.medicationName}
                          </Typography>
                          <Typography variant="body2">
                            Strength: {medication.strength ?? 'Not recorded'}
                          </Typography>
                          <Typography variant="body2">
                            Dose: {medication.dose ?? 'Not recorded'}{' '}
                            {medication.doseUnit ?? ''}
                          </Typography>
                          <Typography variant="body2">
                            Route: {medication.route ?? 'Not recorded'}
                          </Typography>
                          <Typography variant="body2">
                            Frequency: {medication.frequency ?? 'Not recorded'}
                          </Typography>
                          <Typography variant="body2">
                            Status: {medication.status ?? 'Not recorded'}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {selectedPatient && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">
                        Diagnostic History
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Laboratory and radiology orders for this patient.
                        Orders from the selected encounter appear first.
                      </Typography>

                      {diagnosticsLoading && <CircularProgress size={24} />}

                      {diagnosticsErrors.map((message) => (
                        <Alert severity="warning" key={message}>
                          {message}
                        </Alert>
                      ))}

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Laboratory Orders
                      </Typography>

                      {!diagnosticsLoading &&
                        !diagnosticsErrors.some((message) =>
                          message.startsWith('Laboratory')) &&
                        labOrders.length === 0 && (
                          <Typography color="text.secondary">
                            No laboratory orders returned.
                          </Typography>
                        )}

                      {[...labOrders]
                        .sort((a, b) =>
                          Number(b.encounterId === selectedEncounter?.id) -
                          Number(a.encounterId === selectedEncounter?.id))
                        .map((order) => (
                          <Box
                            key={order.id}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 2,
                            }}
                          >
                            <Stack spacing={1}>
                              <Typography sx={{ fontWeight: 600 }}>
                                {order.orderNumber}
                              </Typography>

                              <Typography variant="body2">
                                Status: {order.status}
                              </Typography>

                              <Typography variant="body2">
                                Priority: {order.priority}
                              </Typography>

                              <Typography variant="caption" color="text.secondary">
                                Ordered: {formatDate(order.orderedAt)}
                              </Typography>

                              {order.encounterId === selectedEncounter?.id && (
                                <Chip
                                  label="Selected encounter"
                                  color="primary"
                                  size="small"
                                  sx={{ alignSelf: 'flex-start' }}
                                />
                              )}

                              {order.items.map((item) => (
                                <Box key={item.id} sx={{ pl: 2 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {item.testName}
                                  </Typography>

                                  <Typography variant="body2">
                                    Test status: {item.status}
                                  </Typography>

                                  {item.result && (
                                    <Stack spacing={0.5}>
                                      <Typography variant="body2">
                                        Result: {
                                          item.result.valueNumeric ??
                                          item.result.valueText ??
                                          'Not recorded'
                                        } {item.result.unit ?? ''}
                                      </Typography>

                                      <Typography variant="body2">
                                        Result status: {item.result.status}
                                      </Typography>

                                      {item.result.abnormalFlag && (
                                        <Chip
                                          size="small"
                                          color="warning"
                                          label={`Flag: ${item.result.abnormalFlag}`}
                                          sx={{ alignSelf: 'flex-start' }}
                                        />
                                      )}
                                    </Stack>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        ))}

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Radiology Orders
                      </Typography>

                      {!diagnosticsLoading &&
                        !diagnosticsErrors.some((message) =>
                          message.startsWith('Radiology')) &&
                        radiologyOrders.length === 0 && (
                          <Typography color="text.secondary">
                            No radiology orders returned.
                          </Typography>
                        )}

                      {[...radiologyOrders]
                        .sort((a, b) =>
                          Number(b.encounterId === selectedEncounter?.id) -
                          Number(a.encounterId === selectedEncounter?.id))
                        .map((order) => (
                          <Box
                            key={order.id}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              p: 2,
                            }}
                          >
                            <Stack spacing={1}>
                              <Typography sx={{ fontWeight: 600 }}>
                                {order.studyDescription}
                              </Typography>

                              <Typography variant="body2">
                                Modality: {order.modality}
                              </Typography>

                              <Typography variant="body2">
                                Body site: {order.bodySite ?? 'Not recorded'}
                              </Typography>

                              <Typography variant="body2">
                                Status: {order.status}
                              </Typography>

                              <Typography variant="caption" color="text.secondary">
                                Ordered: {formatDate(order.orderedAt)}
                              </Typography>

                              {order.encounterId === selectedEncounter?.id && (
                                <Chip
                                  label="Selected encounter"
                                  color="primary"
                                  size="small"
                                  sx={{ alignSelf: 'flex-start' }}
                                />
                              )}

                              {order.result && (
                                <Stack spacing={1}>
                                  <Typography variant="body2">
                                    Result status: {
                                      order.result.status ?? 'Not recorded'
                                    }
                                  </Typography>

                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    Findings: {
                                      order.result.findings ?? 'Not recorded'
                                    }
                                  </Typography>

                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    Impression: {
                                      order.result.impression ?? 'Not recorded'
                                    }
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </Box>
                        ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
              {selectedEncounter && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">
                        Encounter Clinical Details
                      </Typography>

                      <Typography>
                        Chief Complaint: {
                          selectedEncounter.chiefComplaint ??
                          'Not recorded'
                        }
                      </Typography>

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Vital Signs
                      </Typography>

                      {loadingDetails && <CircularProgress size={24} />}

                      {!loadingDetails && vitals.length === 0 && (
                        <Typography color="text.secondary">
                          No vital signs recorded.
                        </Typography>
                      )}

                      {vitals.map((vital) => (
                        <Box key={vital.id}>
                          <Typography>
                            {vital.name}: {
                              vital.valueNumeric ?? 'Not recorded'
                            } {vital.unit ?? ''}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatDate(vital.observedAt)}
                          </Typography>
                        </Box>
                      ))}

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Diagnoses
                      </Typography>

                      {!loadingDetails && diagnoses.length === 0 && (
                        <Typography color="text.secondary">
                          No diagnoses recorded.
                        </Typography>
                      )}

                      {diagnoses.map((diagnosis) => (
                        <Box key={diagnosis.id}>
                          <Typography>
                            {diagnosis.description}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {diagnosis.code ?? 'No code'}
                            {' — '}
                            {diagnosis.status}
                          </Typography>
                        </Box>
                      ))}

                      <Divider />

                      <Typography sx={{ fontWeight: 600 }}>
                        Clinical Notes
                      </Typography>

                      {loadingNotes && <CircularProgress size={24} />}

                      {!loadingNotes && notes.length === 0 && (
                        <Typography color="text.secondary">
                          No clinical notes returned for this encounter.
                        </Typography>
                      )}

                      {notes.map((note) => (
                        <Box key={note.id}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {note.title || note.noteType || 'Clinical Note'}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap' }}
                          >
                            {note.content ?? 'No content'}
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Status: {note.status ?? 'Not recorded'}
                            {' | '}
                            Created: {formatDate(note.createdAt)}
                          </Typography>
                        </Box>
                      ))}

                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}