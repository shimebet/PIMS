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
import EncountersPage from './pages/EncountersPage';
import HealthReportsPage from './pages/HealthReportsPage';

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
  path="/reports"
  element={
    <ProtectedRoute>
      <HealthReportsPage />
    </ProtectedRoute>
  }
/>

 {[
  ['clinical', 'Clinical Records'],
  ['laboratory', 'Laboratory'],
  ['radiology', 'Radiology'],
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
