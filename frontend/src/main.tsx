
import React from 'react';
import ReactDOM from 'react-dom/client';

import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';

import { AuthProvider } from './auth/AuthContext';
import App from './App';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1769aa',
    },
    background: {
      default: '#f8fafc',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

ReactDOM.createRoot(
  document.getElementById('root')!,
).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
