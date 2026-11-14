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

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <LoginPage />
  );
}

function ModulePlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <div>
      <h2>{title}</h2>
      <p>
        This PIMS module is planned for a future development step.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
{[
  
  

  ['administration', 'Administration'],
  ['audit', 'Audit Logs'],
].map(([path, title]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute>
                <ModulePlaceholder title={title} />
              </ProtectedRoute>
            }
          />
        ))}

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
