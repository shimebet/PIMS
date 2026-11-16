import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

import {
  LANGUAGE_OPTIONS,
  OCCUPATION_OPTIONS,
} from '../../data/patient-registration-options';
import { patientsApi } from '../../api/patients.api';
import type { Patient } from '../../types/patient';
import { validatePersonNames } from '../../utils/person-name-validation';

interface Props {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface FormValues {
  phone: string;
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
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = validatePersonNames({
    firstName: values.firstName,
    middleName: values.middleName,
    lastName: values.lastName,
  });

  const phone = values.phone.trim();

  if (phone && !/^\+?[0-9]{9,15}$/.test(phone)) {
    errors.phone =
      'Enter 9-15 digits, optionally starting with +.';
  }

  return errors;
}
function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      return 'You do not have permission to update patients.';
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    const message: unknown = error.response?.data?.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message
        .filter(
          (item): item is string => typeof item === 'string',
        )
        .join(', ');
    }
  }

  return 'Unable to update patient. Please try again.';
}

export default function PatientEditDialog({
  open,
  patient,
  onClose,
  onUpdated,
}: Props) {
  const [form, setForm] = useState<FormValues>({
    firstName: '',
    phone: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    birthDateEstimated: false,
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    nationality: '',
    preferredLanguage: '',
    occupation: '',
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patient) return;

    setForm({
      firstName: patient.firstName ?? '',
      phone:
        patient.contacts?.find(
          (contact) =>
            contact.contactType === 'PHONE' &&
            contact.isPrimary,
        )?.contactValue ??
        patient.contacts?.find(
          (contact) => contact.contactType === 'PHONE',
        )?.contactValue ??
        '',
      middleName: patient.middleName ?? '',
      lastName: patient.lastName ?? '',
      dateOfBirth: patient.dateOfBirth
        ? patient.dateOfBirth.slice(0, 10)
        : '',
      birthDateEstimated: patient.birthDateEstimated ?? false,
      gender: patient.gender ?? '',
      bloodGroup: patient.bloodGroup ?? '',
      maritalStatus: patient.maritalStatus ?? '',
      nationality: patient.nationality ?? '',
      preferredLanguage: patient.preferredLanguage ?? '',
      occupation: patient.occupation ?? '',
    });

    setErrors({});
    setServerError(null);
  }, [open, patient]);

  const updateField = (
    key: keyof FormValues,
    value: string | boolean,
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
    }));

    setServerError(null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!patient || saving) return;

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const changes: {
      firstName?: string;
      phone?: string;
      middleName?: string;
      lastName?: string;
      dateOfBirth?: string;
      birthDateEstimated?: boolean;
      gender?: string;
      bloodGroup?: string;
      maritalStatus?: string;
      nationality?: string;
      preferredLanguage?: string;
      occupation?: string;
    } = {};

    // PATIENT_PHONE_EDIT_P12I16
    const originalPhone =
      patient.contacts?.find(
        (contact) =>
          contact.contactType === 'PHONE' &&
          contact.isPrimary,
      )?.contactValue ??
      patient.contacts?.find(
        (contact) => contact.contactType === 'PHONE',
      )?.contactValue ??
      '';

    const nextPhone = form.phone.trim();

    // Empty input preserves existing phone information.
    if (nextPhone && nextPhone !== originalPhone) {
      changes.phone = nextPhone;
    }
    const firstName = form.firstName.trim();
    const middleName = form.middleName.trim();
    const lastName = form.lastName.trim();

    if (firstName !== patient.firstName) {
      changes.firstName = firstName;
    }

    if (middleName !== (patient.middleName ?? '')) {
      changes.middleName = middleName;
    }

    if (lastName !== patient.lastName) {
      changes.lastName = lastName;
    }

    const originalDob = patient.dateOfBirth
      ? patient.dateOfBirth.slice(0, 10)
      : '';

    if (form.dateOfBirth !== originalDob) {
      if (!form.dateOfBirth) {
        setServerError(
          'Clearing an existing date of birth is not supported yet.',
        );
        return;
      }

      const parsed = new Date(
        `${form.dateOfBirth}T00:00:00.000Z`,
      );

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== form.dateOfBirth ||
        form.dateOfBirth > new Date().toISOString().slice(0, 10)
      ) {
        setServerError('Enter a valid date of birth.');
        return;
      }

      changes.dateOfBirth =
        `${form.dateOfBirth}T00:00:00.000Z`;
    }

    if (
      form.birthDateEstimated !==
      (patient.birthDateEstimated ?? false)
    ) {
      changes.birthDateEstimated = form.birthDateEstimated;
    }

    for (const key of [
      'gender',
      'bloodGroup',
      'maritalStatus',
    ] as const) {
      const original = patient[key] ?? '';
      const next = form[key];

      if (next !== original) {
        if (!next) {
          setServerError(
            `Clearing ${key} is not supported yet.`,
          );
          return;
        }

        changes[key] = next;
      }
    }
    for (const key of [
      'nationality',
      'preferredLanguage',
      'occupation',
    ] as const) {
      const original = patient[key] ?? '';
      const next = form[key].trim();

      if (next !== original) {
        if (!next) {
          setServerError(
            `Clearing ${key} is not supported yet.`,
          );
          return;
        }

        changes[key] = next;
      }
    }
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setServerError(null);

    try {
      await patientsApi.update(patient.id, changes);
      onUpdated();
    } catch (error) {
      setServerError(errorMessage(error));
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
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <DialogTitle>
          Edit Patient Information
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {serverError && (
              <Alert severity="error">
                {serverError}
              </Alert>
            )}

            <TextField
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(event) =>
                updateField('phone', event.target.value)
              }
              error={Boolean(errors.phone)}
              helperText={
                errors.phone ??
                '9-15 digits, optionally starting with +. Blank preserves the existing phone.'
              }
              fullWidth
              disabled={saving}
              slotProps={{
                htmlInput: {
                  maxLength: 16,
                  inputMode: 'tel',
                },
              }}
            />
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={(event) =>
                updateField(
                  'firstName',
                  event.target.value,
                )
              }
              error={Boolean(errors.firstName)}
              helperText={errors.firstName}
              required
              fullWidth
              disabled={saving}
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />

            <TextField
              label="Middle Name"
              value={form.middleName}
              onChange={(event) =>
                updateField(
                  'middleName',
                  event.target.value,
                )
              }
              error={Boolean(errors.middleName)}
              helperText={errors.middleName}
              fullWidth
              disabled={saving}
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />

            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={(event) =>
                updateField(
                  'lastName',
                  event.target.value,
                )
              }
              error={Boolean(errors.lastName)}
              helperText={errors.lastName}
              required
              fullWidth
              disabled={saving}
              slotProps={{
                htmlInput: { maxLength: 100 },
              }}
            />
            <TextField
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                updateField('dateOfBirth', event.target.value)
              }
              disabled={saving}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.birthDateEstimated}
                  onChange={(event) =>
                    updateField(
                      'birthDateEstimated',
                      event.target.checked,
                    )
                  }
                  disabled={saving}
                />
              }
              label="Date of birth is estimated"
            />

            {([
              {
                key: 'gender',
                label: 'Gender',
                options: ['MALE', 'FEMALE', 'OTHER'],
              },
              {
                key: 'bloodGroup',
                label: 'Blood Group',
                options: [
                  'A+', 'A-', 'B+', 'B-',
                  'AB+', 'AB-', 'O+', 'O-',
                ],
              },
              {
                key: 'maritalStatus',
                label: 'Marital Status',
                options: [
                  'SINGLE', 'MARRIED',
                  'DIVORCED', 'WIDOWED',
                ],
              },
            ] as const).map(({ key, label, options }) => {
              const currentValue = form[key];
              const values: readonly string[] = options;

              return (
                <TextField
                  key={key}
                  select
                  label={label}
                  value={currentValue}
                  onChange={(event) =>
                    updateField(key, event.target.value)
                  }
                  disabled={saving}
                  fullWidth
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {currentValue &&
                    !values.includes(currentValue) && (
                      <MenuItem value={currentValue}>
                        {currentValue} (existing)
                      </MenuItem>
                    )}
                  {options.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              );
            })}
            <TextField
              label="Nationality"
              value={form.nationality}
              onChange={(event) =>
                updateField('nationality', event.target.value)
              }
              disabled={saving}
              fullWidth
            />

            {([
              {
                key: 'preferredLanguage',
                label: 'Preferred Language',
                options: LANGUAGE_OPTIONS,
              },
              {
                key: 'occupation',
                label: 'Occupation',
                options: OCCUPATION_OPTIONS,
              },
            ] as const).map(({ key, label, options }) => {
              const currentValue = form[key];

              const hasCurrentOption = options.some(
                (option) => option.value === currentValue,
              );

              return (
                <TextField
                  key={key}
                  select
                  label={label}
                  value={currentValue}
                  onChange={(event) =>
                    updateField(key, event.target.value)
                  }
                  disabled={saving}
                  fullWidth
                >
                  <MenuItem value="">
                    Not specified
                  </MenuItem>

                  {currentValue && !hasCurrentOption && (
                    <MenuItem value={currentValue}>
                      {currentValue} (existing)
                    </MenuItem>
                  )}

                  {options.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={saving || !patient}
            startIcon={
              saving
                ? <CircularProgress size={16} />
                : undefined
            }
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}