
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';

import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          typeof err.response?.data?.message === 'string'
            ? err.response.data.message
            : 'Login failed. Check your credentials or server connection.',
        );
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: 4,
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LocalHospitalIcon
                sx={{
                  fontSize: 54,
                  color: 'primary.main',
                  mb: 1,
                }}
              />

              <Typography
                variant="h4"
                sx={{ fontWeight: 700 }}
              >
                PIMS
              </Typography>

              <Typography color="text.secondary">
                Patient Information Management System
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
            >
              <TextField
                fullWidth
                required
                label="Username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoComplete="username"
                margin="normal"
              />

              <TextField
                fullWidth
                required
                label="Password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                margin="normal"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, py: 1.5 }}
              >
                {loading ? (
                  <CircularProgress
                    size={24}
                    color="inherit"
                  />
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
