import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import type { ReactNode } from 'react';

import { useAuth } from './auth/AuthContext';
import AppLayout from './layouts/AppLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import EncountersPage from './pages/EncountersPage';
import ClinicalRecordsPage from './pages/ClinicalRecordsPage';
import HealthReportsPage from './pages/HealthReportsPage';
import AppointmentReportsPage from './pages/AppointmentReportsPage';
import LaboratoryPage from './pages/LaboratoryPage';
import RadiologyPage from './pages/RadiologyPage';
import AdministrationPage from './pages/AdministrationPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordForm from './components/auth/ChangePasswordForm';

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password-required" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password-required" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function MandatoryPasswordRoute() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '64px auto',
        padding: 16,
      }}
    >
      <h1>Password Change Required</h1>
      <p>
        Your administrator has reset your password.
        Change your temporary password before continuing.
      </p>
      <ChangePasswordForm />
    </main>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/change-password-required"
          element={<MandatoryPasswordRoute />}
        />
        <Route
          path="/login"
          element={<LoginRoute />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/radiology"
          element={
            <ProtectedRoute>
              <RadiologyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laboratory"
          element={
            <ProtectedRoute>
              <LaboratoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
  path="/encounters"
  element={
    <ProtectedRoute>
      <EncountersPage />
    </ProtectedRoute>
  }
/>
        <Route
          path="/reports/appointments"
          element={
            <ProtectedRoute>
              <AppointmentReportsPage />
            </ProtectedRoute>
          }
        />

<Route
  path="/reports"
  element={
    <ProtectedRoute>
      <HealthReportsPage />
    </ProtectedRoute>
  }
/>

         <Route
          path="/clinical"
          element={
            <ProtectedRoute>
              <ClinicalRecordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/administration"
          element={
            <ProtectedRoute>
              <AdministrationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

