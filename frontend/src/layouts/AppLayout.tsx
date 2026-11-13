
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  AppBar,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ScienceIcon from '@mui/icons-material/Science';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 250;

const navigation = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Patients', path: '/patients', icon: <PeopleIcon /> },
  { label: 'Appointments', path: '/appointments', icon: <EventNoteIcon /> },
  { label: 'Encounters', path: '/encounters', icon: <AssignmentIcon /> },
  { label: 'Clinical Records', path: '/clinical', icon: <MedicalServicesIcon /> },
  { label: 'Laboratory', path: '/laboratory', icon: <ScienceIcon /> },
  { label: 'Radiology', path: '/radiology', icon: <ImageSearchIcon /> },
  { label: 'Administration', path: '/administration', icon: <AdminPanelSettingsIcon /> },
  { label: 'Audit Logs', path: '/audit', icon: <HistoryIcon /> },
];

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(
    () => window.location.pathname.startsWith('/reports')
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const currentPage =
    location.pathname === '/reports'
      ? 'Health Office Reports'
      : location.pathname === '/reports/appointments'
        ? 'Appointment Reports'
        : navigation.find(
            (item) => item.path === location.pathname
          )?.label ?? 'PIMS';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const drawerContent = (
    <Box>
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          PIMS
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Patient Information Management System
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, pt: 2 }}>
        {navigation.map((item) => (
          <Box key={item.path}>
            {item.path === '/administration' && (
              <>
                <ListItemButton
                  selected={location.pathname.startsWith('/reports')}
                  onClick={() => setReportOpen((previous) => !previous)}
                  sx={{ mb: 0.5, borderRadius: 2, gap: 2 }}
                >
                  <AssessmentIcon />
                  <ListItemText primary="Report" />
                  {reportOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>

                <Collapse in={reportOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItemButton
                      selected={location.pathname === '/reports'}
                      onClick={() => {
                        navigate('/reports');
                        setMobileOpen(false);
                      }}
                      sx={{ pl: 5, mb: 0.5, borderRadius: 2, gap: 1.5 }}
                    >
                      <AssessmentIcon fontSize="small" />
                      <ListItemText primary="Health Office Reports" />
                    </ListItemButton>

                    <ListItemButton
                      selected={location.pathname === '/reports/appointments'}
                      onClick={() => {
                        navigate('/reports/appointments');
                        setMobileOpen(false);
                      }}
                      sx={{ pl: 5, mb: 0.5, borderRadius: 2, gap: 1.5 }}
                    >
                      <CalendarMonthIcon fontSize="small" />
                      <ListItemText primary="Appointment Reports" />
                    </ListItemButton>
                  </List>
                </Collapse>
              </>
            )}

            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                gap: 2,
              }}
            >
              {item.icon}
              <ListItemText primary={item.label} />
            </ListItemButton>
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fb' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid #e5e7eb',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {currentPage}
          </Typography>

          <Typography
            variant="body2"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            {user?.firstName || user?.username}
          </Typography>

          <Button variant="outlined" size="small" onClick={() => void handleLogout()}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
