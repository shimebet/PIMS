import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import ChangePasswordForm from '../components/auth/ChangePasswordForm';
import { validatePersonNames } from '../utils/person-name-validation';

import {
  authApi,
  type UserProfile,
  type UpdateProfileRequest,
} from '../api/auth.api';

type EditableField =
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'email'
  | 'phone';

const editableFields: EditableField[] = [
  'firstName',
  'middleName',
  'lastName',
  'email',
  'phone',
];

const emptyForm: Record<EditableField, string> = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
};

type ProfileErrors = Partial<Record<EditableField, string>>;

function validateProfile(
  values: Record<EditableField, string>,
): ProfileErrors {
  const errors: ProfileErrors = {};

  Object.assign(
    errors,
    validatePersonNames({
      firstName: values.firstName,
      middleName: values.middleName,
      lastName: values.lastName,
    }),
  );
  const email = values.email.trim();

  if (
    email &&
    (
      email.length > 191 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
  ) {
    errors.email = 'Enter a valid email address.';
  }

  const phone = values.phone.trim();

  if (
    phone &&
    !/^(?:0[97]|\+251[97])[0-9]{8}$/.test(phone)
  ) {
    errors.phone =
      'Enter an Ethiopian mobile number, e.g. 0912345678 or +251912345678.';
  }

  return errors;
}
function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;

    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }
  }

  return 'The operation could not be completed.';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const result = await authApi.getProfile();

        if (!active) return;

        setProfile(result);
        setFieldErrors({});
        setValidationAttempted(false);

        setForm({
          firstName: result.firstName ?? '',
          middleName: result.middleName ?? '',
          lastName: result.lastName ?? '',
          email: result.email ?? '',
          phone: result.phone ?? '',
        });
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (
    field: EditableField,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccess('');

    if (validationAttempted) {
      setFieldErrors(
        validateProfile({
          ...form,
          [field]: value,
        }),
      );
    }
  };

  const handleSave = async () => {
    if (!profile || saving) return;

    setError('');
    setSuccess('');

    setValidationAttempted(true);

    const errors = validateProfile(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please correct the highlighted fields before saving.');
      return;
    }

    const changes: UpdateProfileRequest = {};

    for (const field of editableFields) {
      const current = form[field].trim();
      const previous = profile[field] ?? '';

      if (current !== previous) {
        changes[field] = current;
      }
    }

    if (Object.keys(changes).length === 0) {
      setSuccess('No changes to save.');
      return;
    }

    setSaving(true);

    try {
      const updated = await authApi.updateProfile(changes);

      setProfile(updated);
      setFieldErrors({});
      setValidationAttempted(false);

      setForm({
        firstName: updated.firstName ?? '',
        middleName: updated.middleName ?? '',
        lastName: updated.lastName ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
      });

      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Profile
          </Typography>

          <Typography color="text.secondary">
            Manage your personal information and account details.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        {success && (
          <Alert severity="success">{success}</Alert>
        )}

        {!profile ? (
          <Alert severity="warning">
            Profile information is unavailable.
          </Alert>
        ) : (
          <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6">
                Account Information
              </Typography>

              <TextField
                label="Username"
                value={profile.username}
                fullWidth
                disabled
              />

              <Divider />

              <Typography variant="h6">
                Personal Information
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
              >
                <TextField
                  label="First Name"
                  value={form.firstName}
                  onChange={(event) =>
                    updateField('firstName', event.target.value)
                  }
                  error={Boolean(fieldErrors.firstName)}
                  helperText={fieldErrors.firstName}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  fullWidth
                  required
                />

                <TextField
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(event) =>
                    updateField('middleName', event.target.value)
                  }
                  error={Boolean(fieldErrors.middleName)}
                  helperText={fieldErrors.middleName}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  fullWidth
                />
              </Stack>

              <TextField
                label="Last Name"
                value={form.lastName}
                onChange={(event) =>
                  updateField('lastName', event.target.value)
                }
                error={Boolean(fieldErrors.lastName)}
                  helperText={fieldErrors.lastName}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                fullWidth
                required
              />

              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField('email', event.target.value)
                }
                error={Boolean(fieldErrors.email)}
                  helperText={fieldErrors.email}
                  slotProps={{ htmlInput: { maxLength: 191 } }}
                fullWidth
              />

              <TextField
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  updateField('phone', event.target.value)
                }
                error={Boolean(fieldErrors.phone)}
                  helperText={fieldErrors.phone}
                  slotProps={{ htmlInput: { maxLength: 30 } }}
                fullWidth
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        )}
        <ChangePasswordForm />
      </Stack>
    </Box>
  );
}