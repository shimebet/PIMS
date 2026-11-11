
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';

import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScienceIcon from '@mui/icons-material/Science';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';

import { useAuth } from '../auth/AuthContext';

const modules = [
  { title: 'Patients', icon: <PeopleIcon color="primary" /> },
  { title: 'Encounters', icon: <AssignmentIcon color="primary" /> },
  { title: 'Laboratory', icon: <ScienceIcon color="primary" /> },
  { title: 'Radiology', icon: <ImageSearchIcon color="primary" /> },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Welcome, {user?.firstName || user?.username}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Patient Information Management System
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        You have successfully signed in to PIMS.
      </Alert>

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid key={module.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                {module.icon}

                <Typography variant="h6" sx={{ mt: 2 }}>
                  {module.title}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Module interface coming next
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Your Access
          </Typography>

          <Typography>
            Roles: {user?.roles.join(', ') || 'None'}
          </Typography>

          <Typography sx={{ mt: 1 }}>
            Permissions: {user?.permissions.length ?? 0}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
