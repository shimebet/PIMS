
import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Autocomplete from '@mui/material/Autocomplete';

import {
  LANGUAGE_OPTIONS,
  OCCUPATION_OPTIONS,
  IDENTIFIER_TYPE_OPTIONS,
} from '../../data/patient-registration-options';

import {
  patientsApi,
} from '../../api/patients.api';
import {
  useGeographicReference,
} from '../../hooks/useGeographicReference';

import type {
  CreatePatientRequest,
  DuplicateCheckRequest,
} from '../../api/patients.api';

const MAIN_FACILITY_ID =
  '3d0d001f-0aab-4cce-af5f-0090ad270ca7';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface IdentifierForm {
  identifierType: string;
  identifierValue: string;
  issuingAuthority: string;
  country: string;
  isPrimary: boolean;
}

interface ContactForm {
  contactType: string;
  contactValue: string;
  isPrimary: boolean;
}

interface AddressForm {
  country: string;
  region: string;
  zone: string;
  district: string;
  city: string;
  subCity: string;
  kebele: string;
  street: string;
  houseNumber: string;
  isPrimary: boolean;
  woredaOther: boolean;
}

interface RegistrationForm {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  birthDateEstimated: boolean;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  nationality: string;
  preferredLanguage: string;
  occupation: string;
  identifiers: IdentifierForm[];
  contacts: ContactForm[];
  addresses: AddressForm[];
}

function emptyIdentifier(): IdentifierForm {
  return {
    identifierType: '',
    identifierValue: '',
    issuingAuthority: '',
    country: '',
    isPrimary: true,
  };
}

function emptyContact(): ContactForm {
  return {
    contactType: 'PHONE',
    contactValue: '',
    isPrimary: true,
  };
}

function emptyAddress(): AddressForm {
  return {
    country: 'Ethiopia',
    region: '',
    zone: '',
    district: '',
    city: '',
    subCity: '',
    kebele: '',
    street: '',
    houseNumber: '',
    isPrimary: true,
    woredaOther: false,
  };
}

function initialForm(): RegistrationForm {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    birthDateEstimated: false,
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    nationality: 'Ethiopian',
    preferredLanguage: '',
    occupation: '',
    identifiers: [emptyIdentifier()],
    contacts: [emptyContact()],
    addresses: [emptyAddress()],
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    if (error.response?.status === 409) {
      return 'Possible duplicate patient found. Registration was blocked.';
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to register patients.';
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
  }

  return 'Unable to complete the operation. Please try again.';
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

interface DuplicateResult {
  possibleDuplicates: unknown[];
}

function parseDuplicateResult(
  value: unknown,
): DuplicateResult | null {
  if (!isRecord(value)) return null;

  if (!Array.isArray(value.possibleDuplicates)) {
    return null;
  }

  return {
    possibleDuplicates: value.possibleDuplicates,
  };
}

export default function PatientRegistrationDialog({
  open,
  onClose,
  onCreated,
}: Props) {
const [form, setForm] =
  useState<RegistrationForm>(initialForm);

const {
  regions: geographicRegions,
  getZones: getGeographicZones,
  getWoredas: getGeographicWoredas,
} = useGeographicReference(
  open,
  form.addresses,
);

const [busy, setBusy] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateResult | null>(null);

  const [checkedPayload, setCheckedPayload] =
    useState<string | null>(null);

  const updateForm = (
    key: keyof RegistrationForm,
    value: string | boolean,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setCheckedPayload(null);
    setDuplicateResult(null);
    setError(null);
  };

  const updateIdentifier = (
    index: number,
    key: keyof IdentifierForm,
    value: string | boolean,
  ) => {
    setForm((previous) => ({
      ...previous,
      identifiers: previous.identifiers.map(
        (item, itemIndex) =>
          itemIndex === index
            ? { ...item, [key]: value }
            : item,
      ),
    }));

    setCheckedPayload(null);
    setDuplicateResult(null);
    setError(null);
  };

  const updateContact = (
    index: number,
    key: keyof ContactForm,
    value: string | boolean,
  ) => {
    setForm((previous) => ({
      ...previous,
      contacts: previous.contacts.map(
        (item, itemIndex) =>
          itemIndex === index
            ? { ...item, [key]: value }
            : item,
      ),
    }));

    setCheckedPayload(null);
    setDuplicateResult(null);
    setError(null);
  };



const updateAddress = (
  index: number,
  key: keyof AddressForm,
  value: string | boolean,
) => {
  setForm((previous) => ({
    ...previous,
    addresses: previous.addresses.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      if (key === 'country') {
        return {
          ...item,
          country: String(value),
          region: '',
          zone: '',
          district: '',
          woredaOther: false,
        };
      }

      if (key === 'region') {
        return {
          ...item,
          region: String(value),
          zone: '',
          district: '',
          woredaOther: false,
        };
      }

      if (key === 'zone') {
        return {
          ...item,
          zone: String(value),
          district: '',
          woredaOther: false,
        };
      }

      if (key === 'woredaOther') {
        return {
          ...item,
          woredaOther: Boolean(value),
          district: '',
        };
      }

      return {
        ...item,
        [key]: value,
      };
    }),
  }));

  setCheckedPayload(null);
  setDuplicateResult(null);
  setError(null);
};



  const addIdentifier = () => {
    setForm((previous) => ({
      ...previous,
      identifiers: [
        ...previous.identifiers,
        { ...emptyIdentifier(), isPrimary: false },
      ],
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const addContact = () => {
    setForm((previous) => ({
      ...previous,
      contacts: [
        ...previous.contacts,
        { ...emptyContact(), isPrimary: false },
      ],
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const addAddress = () => {
    setForm((previous) => ({
      ...previous,
      addresses: [
        ...previous.addresses,
        { ...emptyAddress(), isPrimary: false },
      ],
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const removeIdentifier = (index: number) => {
    setForm((previous) => ({
      ...previous,
      identifiers: previous.identifiers.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const removeContact = (index: number) => {
    setForm((previous) => ({
      ...previous,
      contacts: previous.contacts.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const removeAddress = (index: number) => {
    setForm((previous) => ({
      ...previous,
      addresses: previous.addresses.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const setPrimaryIdentifier = (index: number) => {
    setForm((previous) => ({
      ...previous,
      identifiers: previous.identifiers.map(
        (item, itemIndex) => ({
          ...item,
          isPrimary: itemIndex === index,
        }),
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const setPrimaryContact = (index: number) => {
    setForm((previous) => ({
      ...previous,
      contacts: previous.contacts.map(
        (item, itemIndex) => ({
          ...item,
          isPrimary: itemIndex === index,
        }),
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const setPrimaryAddress = (index: number) => {
    setForm((previous) => ({
      ...previous,
      addresses: previous.addresses.map(
        (item, itemIndex) => ({
          ...item,
          isPrimary: itemIndex === index,
        }),
      ),
    }));
    setCheckedPayload(null);
    setDuplicateResult(null);
  };

  const buildPayload = (): CreatePatientRequest => {
    const payload: CreatePatientRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      registrationFacilityId: MAIN_FACILITY_ID,
      birthDateEstimated: form.birthDateEstimated,
    };

    const middleName = optional(form.middleName);
    const gender = optional(form.gender);
    const bloodGroup = optional(form.bloodGroup);
    const maritalStatus = optional(form.maritalStatus);
    const nationality = optional(form.nationality);
    const preferredLanguage =
      optional(form.preferredLanguage);
    const occupation = optional(form.occupation);

    if (middleName) payload.middleName = middleName;
    if (gender) payload.gender = gender;
    if (bloodGroup) payload.bloodGroup = bloodGroup;
    if (maritalStatus) {
      payload.maritalStatus = maritalStatus;
    }
    if (nationality) payload.nationality = nationality;
    if (preferredLanguage) {
      payload.preferredLanguage = preferredLanguage;
    }
    if (occupation) payload.occupation = occupation;

    if (form.dateOfBirth) {
      payload.dateOfBirth =
        `${form.dateOfBirth}T00:00:00.000Z`;
    }

    payload.identifiers = form.identifiers
      .filter(
        (item) =>
          item.identifierType.trim() &&
          item.identifierValue.trim(),
      )
      .map((item) => ({
        identifierType: item.identifierType.trim(),
        identifierValue: item.identifierValue.trim(),
        issuingAuthority: optional(item.issuingAuthority),
        country: optional(item.country),
        isPrimary: item.isPrimary,
      }));

    payload.contacts = form.contacts
      .filter((item) => item.contactValue.trim())
      .map((item) => ({
        contactType: item.contactType,
        contactValue: item.contactValue.trim(),
        isPrimary: item.isPrimary,
      }));

    payload.addresses = form.addresses
      .filter((item) =>
        [
          item.region,
          item.zone,
          item.district,
          item.city,
          item.subCity,
          item.kebele,
          item.street,
          item.houseNumber,
        ].some((value) => value.trim()),
      )
      .map((item) => ({
        country: optional(item.country),
        region: optional(item.region),
        zone: optional(item.zone),
        district: optional(item.district),
        city: optional(item.city),
        subCity: optional(item.subCity),
        kebele: optional(item.kebele),
        street: optional(item.street),
        houseNumber: optional(item.houseNumber),
        isPrimary: item.isPrimary,
      }));

    return payload;
  };

  const buildDuplicateRequest =
    (): DuplicateCheckRequest => {
      const phone = form.contacts.find(
        (item) =>
          item.contactType === 'PHONE' &&
          item.contactValue.trim(),
      )?.contactValue.trim();

      return {
        firstName: form.firstName.trim(),
        middleName: optional(form.middleName),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth
          ? `${form.dateOfBirth}T00:00:00.000Z`
          : undefined,
        phone,
      };
    };

  const validate = (): boolean => {

const invalidWoreda = form.addresses.some(
  (address) =>
    (address.woredaOther &&
      !address.district.trim()) ||
    address.district.trim() === '__OTHER__',
);

if (invalidWoreda) {
  setError(
    'Please enter the actual woreda name before continuing.',
  );
  return false;
}

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setError(
        'First name and last name are required.',
      );
      return false;
    }

    if (
      form.firstName.trim().length > 100 ||
      form.middleName.trim().length > 100 ||
      form.lastName.trim().length > 100
    ) {
      setError(
        'Patient names must not exceed 100 characters.',
      );
      return false;
    }

    if (form.dateOfBirth) {
      const date = new Date(
        `${form.dateOfBirth}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(date.getTime()) ||
        form.dateOfBirth >
          new Date().toISOString().slice(0, 10)
      ) {
        setError('Enter a valid date of birth.');
        return false;
      }
    }

    for (const identifier of form.identifiers) {
      const hasType = Boolean(
        identifier.identifierType.trim(),
      );

      const hasValue = Boolean(
        identifier.identifierValue.trim(),
      );

      if (hasType !== hasValue) {
        setError(
          'Every identifier must have both a type and a number.',
        );
        return false;
      }
    }

    for (const contact of form.contacts) {
      const value = contact.contactValue.trim();

      if (!value) continue;

      if (
        contact.contactType === 'EMAIL' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        setError('Enter a valid email address.');
        return false;
      }
    }

    return true;
  };

  const handleDuplicateCheck = async () => {
    if (!validate()) return;

    setBusy(true);
    setError(null);
    setCheckedPayload(null);
    setDuplicateResult(null);

    const payload = buildPayload();
    const snapshot = JSON.stringify(payload);

    try {
      const response = await patientsApi.checkDuplicates(
        buildDuplicateRequest(),
      );

      const parsed = parseDuplicateResult(response);

      if (!parsed) {
        setError(
          'The duplicate-check API returned an unexpected response. Registration is blocked.',
        );
        return;
      }

      setDuplicateResult(parsed);

      if (parsed.possibleDuplicates.length === 0) {
        setCheckedPayload(snapshot);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!validate()) return;

    const payload = buildPayload();

    if (
      checkedPayload === null ||
      checkedPayload !== JSON.stringify(payload) ||
      duplicateResult?.possibleDuplicates.length !== 0
    ) {
      setError(
        'Check for duplicate patients before registration.',
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await patientsApi.create(payload);

      setForm(initialForm());
      setCheckedPayload(null);
      setDuplicateResult(null);

      onCreated();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));

      if (
        axios.isAxiosError(err) &&
        err.response?.status === 409
      ) {
        setCheckedPayload(null);

        const data: unknown = err.response.data;
        const parsed = parseDuplicateResult(data);

        if (parsed) {
          setDuplicateResult(parsed);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;

    setForm(initialForm());
    setError(null);
    setCheckedPayload(null);
    setDuplicateResult(null);
    onClose();
  };

  const gridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, minmax(0, 1fr))',
    },
    gap: 2,
  };

  const personalField = (
    key: keyof RegistrationForm,
    label: string,
    required = false,
  ) => (
    <TextField
      fullWidth
      label={label}
      required={required}
      value={form[key]}
      disabled={busy}
      onChange={(event) =>
        updateForm(key, event.target.value)
      }
    />
  );

  const canRegister =
    checkedPayload !== null &&
    checkedPayload === JSON.stringify(buildPayload()) &&
    duplicateResult?.possibleDuplicates.length === 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
    >
      <Box
        component="form"
        onSubmit={(event) => void handleRegister(event)}
      >
        <DialogTitle>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700 }}
          >
            Register New Patient
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Complete patient registration and
            duplicate verification.
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity="info">
              Registration facility: Main Hospital (MAIN).
              The patient number will be generated
              automatically by PIMS.
            </Alert>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Typography
              variant="h6"
              sx={{ fontWeight: 600 }}
            >
              1. Personal Information
            </Typography>

            <Box sx={gridSx}>
              {personalField(
                'firstName',
                'First Name',
                true,
              )}

              {personalField(
                'middleName',
                'Middle Name',
              )}

              {personalField(
                'lastName',
                'Last Name',
                true,
              )}

              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                disabled={busy}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                onChange={(event) =>
                  updateForm(
                    'dateOfBirth',
                    event.target.value,
                  )
                }
              />

              <TextField
                select
                fullWidth
                label="Gender"
                value={form.gender}
                disabled={busy}
                onChange={(event) =>
                  updateForm(
                    'gender',
                    event.target.value,
                  )
                }
              >
                <MenuItem value="">
                  Not specified
                </MenuItem>
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </TextField>

              <TextField
                select
                fullWidth
                label="Blood Group"
                value={form.bloodGroup}
                disabled={busy}
                onChange={(event) =>
                  updateForm(
                    'bloodGroup',
                    event.target.value,
                  )
                }
              >
                <MenuItem value="">
                  Not specified
                </MenuItem>

                {[
                  'A+', 'A-', 'B+', 'B-',
                  'AB+', 'AB-', 'O+', 'O-',
                ].map((value) => (
                  <MenuItem
                    key={value}
                    value={value}
                  >
                    {value}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Marital Status"
                value={form.maritalStatus}
                disabled={busy}
                onChange={(event) =>
                  updateForm(
                    'maritalStatus',
                    event.target.value,
                  )
                }
              >
                <MenuItem value="">
                  Not specified
                </MenuItem>

                {[
                  'SINGLE',
                  'MARRIED',
                  'DIVORCED',
                  'WIDOWED',
                ].map((value) => (
                  <MenuItem
                    key={value}
                    value={value}
                  >
                    {value}
                  </MenuItem>
                ))}
              </TextField>

              {personalField(
                'nationality',
                'Nationality',
              )}


<TextField
  select
  fullWidth
  label="Preferred Language"
  value={form.preferredLanguage}
  disabled={busy}
  onChange={(event) =>
    updateForm('preferredLanguage', event.target.value)
  }
>
  <MenuItem value="">Not specified</MenuItem>

  {LANGUAGE_OPTIONS.map((option) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</TextField>

<TextField
  select
  fullWidth
  label="Occupation"
  value={form.occupation}
  disabled={busy}
  onChange={(event) =>
    updateForm('occupation', event.target.value)
  }
>
  <MenuItem value="">Not specified</MenuItem>

  {OCCUPATION_OPTIONS.map((option) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</TextField>

            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.birthDateEstimated}
                  disabled={busy}
                  onChange={(event) =>
                    updateForm(
                      'birthDateEstimated',
                      event.target.checked,
                    )
                  }
                />
              }
              label="Date of birth is estimated"
            />

            <Divider />

            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                2. Patient Identification
              </Typography>

              <Button
                startIcon={<AddIcon />}
                disabled={busy}
                onClick={addIdentifier}
              >
                Add Identifier
              </Button>
            </Stack>

            {form.identifiers.map((item, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2 }}
              >
                <Stack spacing={2}>
                  <Box sx={gridSx}>

<TextField
  select
  fullWidth
  label="Identifier Type"
  value={item.identifierType}
  disabled={busy}
  onChange={(event) =>
    updateIdentifier(
      index,
      'identifierType',
      event.target.value,
    )
  }
>
  <MenuItem value="">Select Identifier Type</MenuItem>

  {IDENTIFIER_TYPE_OPTIONS.map((option) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</TextField>


                    <TextField
                      label="Identifier Number"
                      value={item.identifierValue}
                      disabled={busy}
                      onChange={(event) =>
                        updateIdentifier(
                          index,
                          'identifierValue',
                          event.target.value,
                        )
                      }
                    />

                    <TextField
                      label="Issuing Authority"
                      value={item.issuingAuthority}
                      disabled={busy}
                      onChange={(event) =>
                        updateIdentifier(
                          index,
                          'issuingAuthority',
                          event.target.value,
                        )
                      }
                    />

                    <TextField
                      label="Issuing Country"
                      value={item.country}
                      disabled={busy}
                      onChange={(event) =>
                        updateIdentifier(
                          index,
                          'country',
                          event.target.value,
                        )
                      }
                    />
                  </Box>

                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.isPrimary}
                          disabled={busy}
                          onChange={() =>
                            setPrimaryIdentifier(index)
                          }
                        />
                      }
                      label="Primary Identifier"
                    />

                    <IconButton
                      color="error"
                      disabled={busy}
                      onClick={() =>
                        removeIdentifier(index)
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}

            <Divider />

            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                3. Contact Information
              </Typography>

              <Button
                startIcon={<AddIcon />}
                disabled={busy}
                onClick={addContact}
              >
                Add Contact
              </Button>
            </Stack>

            {form.contacts.map((item, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2 }}
              >
                <Stack spacing={2}>
                  <Box sx={gridSx}>
                    <TextField
                      select
                      label="Contact Type"
                      value={item.contactType}
                      disabled={busy}
                      onChange={(event) =>
                        updateContact(
                          index,
                          'contactType',
                          event.target.value,
                        )
                      }
                    >
                      <MenuItem value="PHONE">
                        Phone
                      </MenuItem>
                      <MenuItem value="EMAIL">
                        Email
                      </MenuItem>
                    </TextField>

                    <TextField
                      label="Contact Value"
                      value={item.contactValue}
                      disabled={busy}
                      onChange={(event) =>
                        updateContact(
                          index,
                          'contactValue',
                          event.target.value,
                        )
                      }
                    />
                  </Box>

                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.isPrimary}
                          disabled={busy}
                          onChange={() =>
                            setPrimaryContact(index)
                          }
                        />
                      }
                      label="Primary Contact"
                    />

                    <IconButton
                      color="error"
                      disabled={busy}
                      onClick={() =>
                        removeContact(index)
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}

            <Divider />

            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                4. Residential Address
              </Typography>

              <Button
                startIcon={<AddIcon />}
                disabled={busy}
                onClick={addAddress}
              >
                Add Address
              </Button>
            </Stack>

            {form.addresses.map((item, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2 }}
              >
                <Stack spacing={2}>
                  <Box sx={gridSx}>

<TextField
  fullWidth
  label="Country"
  value={item.country}
  disabled={busy}
  onChange={(event) =>
    updateAddress(index, 'country', event.target.value)
  }
/>


<Autocomplete
  fullWidth
  options={geographicRegions}
  getOptionLabel={(option) => option.label}
  isOptionEqualToValue={(option, value) =>
    option.value === value.value
  }
  value={
geographicRegions.find(
  (option) => option.value === item.region,
) ?? null
  }
  disabled={
    busy ||
    item.country.trim().toLowerCase() !== 'ethiopia'
  }
  onChange={(_, selected) =>
    updateAddress(
      index,
      'region',
      selected?.value ?? '',
    )
  }
  renderInput={(params) => (
    <TextField
      {...params}
      label="Region"
      placeholder="Search region"
    />
  )}
/>


{getGeographicZones(item.region).length > 0 ? (
  <Autocomplete
    fullWidth
    options={getGeographicZones(item.region)}
    getOptionLabel={(option) => option.label}
    isOptionEqualToValue={(option, value) =>
      option.value === value.value
    }
    value={
      getGeographicZones(item.region).find(
        (option) => option.value === item.zone,
      ) ?? null
    }
    disabled={busy || !item.region}
    onChange={(_, selected) =>
      updateAddress(
        index,
        'zone',
        selected?.value ?? '',
      )
    }
    renderInput={(params) => (
      <TextField
        {...params}
        label="Zone"
        placeholder="Search zone"
      />
    )}
  />
) : (
  <TextField
    fullWidth
    label="Zone"
    value={item.zone}
    disabled={busy || !item.region}
    onChange={(event) =>
      updateAddress(
        index,
        'zone',
        event.target.value,
      )
    }
    helperText="Enter the zone if it is not yet in the reference list."
  />
)}





{getGeographicWoredas(item.region, item.zone).length > 0 ? (
  <>
    <Autocomplete
      fullWidth
      options={[
        ...getGeographicWoredas(item.region, item.zone),
        {
          value: '__OTHER__',
          label: 'Other / Not Listed',
        },
      ]}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) =>
        option.value === value.value
      }
      value={
        item.woredaOther
          ? {
              value: '__OTHER__',
              label: 'Other / Not Listed',
            }
          : getGeographicWoredas(item.region, item.zone).find(
              (option) =>
                option.value === item.district,
            ) ?? null
      }
      disabled={busy || !item.zone}
      onChange={(_, selected) => {
        if (selected?.value === '__OTHER__') {
          updateAddress(
            index,
            'woredaOther',
            true,
          );
        } else {
          const selectedWoreda =
            selected?.value ?? '';

          setForm((previous) => ({
            ...previous,
            addresses: previous.addresses.map(
              (address, addressIndex) =>
                addressIndex === index
                  ? {
                      ...address,
                      district: selectedWoreda,
                      woredaOther: false,
                    }
                  : address,
            ),
          }));

          setCheckedPayload(null);
          setDuplicateResult(null);
          setError(null);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="District / Woreda"
          placeholder="Search woreda"
        />
      )}
    />

    {item.woredaOther && (
      <TextField
        fullWidth
        required
        label="Enter Woreda Name"
        value={item.district}
        disabled={busy}
        onChange={(event) =>
          updateAddress(
            index,
            'district',
            event.target.value,
          )
        }
        error={!item.district.trim()}
        helperText={
          !item.district.trim()
            ? 'Enter the actual woreda name.'
            : 'This name will be saved in the patient address.'
        }
      />
    )}
  </>
) : (
  <TextField
    fullWidth
    label="District / Woreda"
    value={item.district}
    disabled={busy || !item.zone}
    onChange={(event) =>
      updateAddress(
        index,
        'district',
        event.target.value,
      )
    }
    helperText="Enter the woreda name."
  />
)}



{item.district === '__OTHER__' && (
  <Alert
    severity="warning"
    sx={{ gridColumn: '1 / -1' }}
  >
    The selected woreda is not listed.
    Patient registration must remain blocked until
    the actual woreda name can be entered and saved.
  </Alert>
)}



{(
  [
    ['city', 'City / Town'],
    ['subCity', 'Sub-city'],
    ['kebele', 'Kebele'],
    ['street', 'Street'],
    ['houseNumber', 'House Number'],
  ] as const
).map(([key, label]) => (
  <TextField
    key={key}
    fullWidth
    label={label}
    value={item[key]}
    disabled={busy}
    onChange={(event) =>
      updateAddress(index, key, event.target.value)
    }
  />
))}

                  </Box>

                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.isPrimary}
                          disabled={busy}
                          onChange={() =>
                            setPrimaryAddress(index)
                          }
                        />
                      }
                      label="Primary Address"
                    />

                    <IconButton
                      color="error"
                      disabled={busy}
                      onClick={() =>
                        removeAddress(index)
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}

            <Divider />

            <Typography
              variant="h6"
              sx={{ fontWeight: 600 }}
            >
              5. Duplicate Patient Check
            </Typography>

            <Typography color="text.secondary">
              Check for existing patient records before
              registration. PIMS compares patient names,
              date of birth, and phone number.
            </Typography>

            <Button
              variant="outlined"
              disabled={busy}
              onClick={() =>
                void handleDuplicateCheck()
              }
            >
              Check for Existing Patient
            </Button>

            {duplicateResult &&
              duplicateResult.possibleDuplicates.length >
                0 && (
                <Alert severity="warning">
                  Possible duplicate patients found.
                  Registration is blocked. Review the
                  existing patient records before proceeding.
                </Alert>
              )}

            {duplicateResult &&
              duplicateResult.possibleDuplicates.length ===
                0 && (
                <Alert severity="success">
                  No possible duplicates were returned
                  by the duplicate-check API.
                </Alert>
              )}

            {duplicateResult &&
              duplicateResult.possibleDuplicates.length >
                0 && (
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'grey.100',
                    p: 2,
                    borderRadius: 2,
                    overflowX: 'auto',
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(
                    duplicateResult.possibleDuplicates,
                    null,
                    2,
                  )}
                </Box>
              )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={busy || !canRegister}
          >
            {busy ? (
              <CircularProgress size={20} />
            ) : (
              'Register Patient'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
