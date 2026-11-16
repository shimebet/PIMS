import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../../api/auth.api';
import { useAuth } from '../../auth/AuthContext';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function errorMessage(error: unknown): string {
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

  return 'Unable to change password. Please try again.';
}

export default function ChangePasswordForm() {
  const navigate = useNavigate();
  const { clearSession } = useAuth();

  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (
    field: keyof PasswordForm,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError('');
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (saving) return;

    if (!form.currentPassword) {
      setError('Enter your current password.');
      return;
    }

    if (
      form.newPassword.length < 12 ||
      form.newPassword.length > 128
    ) {
      setError('New password must contain 12 to 128 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError('Choose a different password.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await authApi.changePassword(form);

      setForm(emptyForm);

      clearSession();

      navigate('/login', {
        replace: true,
        state: {
          message: 'Password changed successfully. Please sign in again.',
        },
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
      <Stack
        component="form"
        spacing={3}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Change Password
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Changing your password will sign you out of all active sessions.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <TextField
          label="Current Password"
          type={showPasswords ? 'text' : 'password'}
          value={form.currentPassword}
          onChange={(event) =>
            updateField('currentPassword', event.target.value)
          }
          autoComplete="current-password"
          fullWidth
          required
        />

        <TextField
          label="New Password"
          type={showPasswords ? 'text' : 'password'}
          value={form.newPassword}
          onChange={(event) =>
            updateField('newPassword', event.target.value)
          }
          autoComplete="new-password"
          slotProps={{
            htmlInput: {
              minLength: 12,
              maxLength: 128,
            },
          }}
          helperText="Use 12 to 128 characters."
          fullWidth
          required
        />

        <TextField
          label="Confirm New Password"
          type={showPasswords ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={(event) =>
            updateField('confirmPassword', event.target.value)
          }
          autoComplete="new-password"
          fullWidth
          required
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => setShowPasswords((previous) => !previous)}
            aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
          >
            {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>

          <Typography variant="body2">
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Changing Password...' : 'Change Password'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}