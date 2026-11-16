import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PasswordIcon from '@mui/icons-material/Password';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import { useAuth } from '../auth/AuthContext';
import { administrationApi } from '../api/administration.api';
import { validatePersonNames } from '../utils/person-name-validation';

import type {
  AdministrationUser,
  CreateAdministrationUser,
  UpdateAdministrationUser,
  UserListResponse,
  RoleAssignmentMode,
} from '../types/administration';

type DialogMode = 'create' | 'edit';

type SecurityAction = 'lock' | 'unlock' | 'assignRole' | 'resetPassword' | 'retire';

const roleOptions = [
  { code: 'SYSTEM_ADMIN', label: 'System Administrator' },
  { code: 'OFFICE_MANAGER', label: 'Office Manager' },
  { code: 'OFFICE_EMPLOYEE', label: 'Office Employee' },
  { code: 'DOCTOR', label: 'Doctor' },
  { code: 'NURSE', label: 'Nurse' },
  { code: 'RECEPTIONIST', label: 'Receptionist' },
  { code: 'LAB_TECHNICIAN', label: 'Laboratory Technician' },
  { code: 'RADIOLOGIST', label: 'Radiologist' },
];

interface StaffForm {
  username: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyForm: StaffForm = {
  username: '',
  password: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
};

function normalizeUsers(response: UserListResponse): AdministrationUser[] {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  throw new Error('Unexpected user-list response from server.');
}

function displayName(user: AdministrationUser): string {
  return [user.firstName, user.middleName, user.lastName]
    .filter(Boolean)
    .join(' ') || user.username;
}

function displayRoles(user: AdministrationUser): string {
  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    return 'No roles assigned';
  }

  return user.roles.map((role: unknown) => {
    if (typeof role === 'string') return role;

    if (role && typeof role === 'object') {
      const item = role as Record<string, unknown>;

      if (typeof item.code === 'string') return item.code;
      if (typeof item.name === 'string') return item.name;

      if (item.role && typeof item.role === 'object') {
        const nested = item.role as Record<string, unknown>;

        if (typeof nested.code === 'string') return nested.code;
        if (typeof nested.name === 'string') return nested.name;
      }
    }

    return 'Unknown role';
  }).join(', ');
}

function accountStatus(user: AdministrationUser): string {
  if (user.isLocked === true) return 'LOCKED';
  return user.status ?? 'UNKNOWN';
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as {
      response?: {
        data?: {
          message?: string | string[];
        };
      };
    }).response;

    const message = response?.data?.message;

    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }

  return error instanceof Error
    ? error.message
    : 'The operation could not be completed.';
}

function validateForm(form: StaffForm, mode: DialogMode): string {
  if (mode === 'create') {
    if (form.username.trim().length < 3) {
      return 'Username must contain at least 3 characters.';
    }

    if (form.username.trim().length > 100) {
      return 'Username must not exceed 100 characters.';
    }

    if (form.password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (form.password.length > 200) {
      return 'Password must not exceed 200 characters.';
    }
  }

  const nameErrors = validatePersonNames({
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
  });

  const nameError =
    nameErrors.firstName ??
    nameErrors.middleName ??
    nameErrors.lastName;

  if (nameError) {
    return nameError;
  }
  if (form.phone.trim().length > 30) {
    return 'Phone number must not exceed 30 characters.';
  }

  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    return 'Enter a valid email address.';
  }

  return '';
}

export default function AdministrationPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdministrationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [selectedUser, setSelectedUser] = useState<AdministrationUser | null>(null);
  const [form, setForm] = useState<StaffForm>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [securityOpen, setSecurityOpen] = useState(false);

  const [securityAction, setSecurityAction] =
    useState<SecurityAction>('lock');

  const [securityUser, setSecurityUser] =
    useState<AdministrationUser | null>(null);

  const [selectedRole, setSelectedRole] = useState('');
  const [roleAssignmentMode, setRoleAssignmentMode] =
    useState<RoleAssignmentMode>('REPLACE');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState('');

  // ADMIN_DELETE_USER_FEATURE
  const [retireReason, setRetireReason] = useState('');
  const [retireConfirmation, setRetireConfirmation] = useState('');

  const [securityError, setSecurityError] = useState('');

  const [securitySaving, setSecuritySaving] = useState(false);

  const canRead = Boolean(currentUser?.permissions.includes('user.read'));
  const canCreate = Boolean(currentUser?.permissions.includes('user.create'));
  const canUpdate = Boolean(currentUser?.permissions.includes('user.update'));

  const canManage = Boolean(
    currentUser?.permissions.includes('user.manage')
  );

  const canManageRoles = Boolean(
    currentUser?.permissions.includes('role.manage')
  );

  const loadUsers = useCallback(async () => {
    if (!canRead) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await administrationApi.listUsers();
      setUsers(normalizeUsers(response));
    } catch (err: unknown) {
      setUsers([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((staff) =>
      [
        staff.username,
        displayName(staff),
        staff.email ?? '',
        staff.phone ?? '',
        displayRoles(staff),
      ].join(' ').toLowerCase().includes(query),
    );
  }, [users, search]);

  const openCreate = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setForm({ ...emptyForm });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (staff: AdministrationUser) => {
    setDialogMode('edit');
    setSelectedUser(staff);
    setForm({
      username: staff.username,
      password: '',
      firstName: staff.firstName ?? '',
      middleName: staff.middleName ?? '',
      lastName: staff.lastName ?? '',
      email: staff.email ?? '',
      phone: staff.phone ?? '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const updateField = (field: keyof StaffForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveStaff = async () => {
    if (saving) return;

    if (
      (dialogMode === 'create' && !canCreate) ||
      (dialogMode === 'edit' && !canUpdate)
    ) {
      setFormError('You do not have permission for this action.');
      return;
    }

    const validationError = validateForm(form, dialogMode);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (dialogMode === 'create') {
        const payload: CreateAdministrationUser = {
          username: form.username.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        };

        if (form.middleName.trim()) payload.middleName = form.middleName.trim();
        if (form.email.trim()) payload.email = form.email.trim();
        if (form.phone.trim()) payload.phone = form.phone.trim();

        await administrationApi.createUser(payload);
        setSuccess('Staff account created successfully.');
      } else {
        if (!selectedUser) {
          throw new Error('No staff account selected.');
        }

        const payload: UpdateAdministrationUser = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim(),
        };

        if (form.email.trim()) payload.email = form.email.trim();
        if (form.phone.trim()) payload.phone = form.phone.trim();

        await administrationApi.updateUser(selectedUser.id, payload);
        setSuccess('Staff account updated successfully.');
      }

      setDialogOpen(false);
      setSelectedUser(null);
      setForm({ ...emptyForm });
      await loadUsers();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openSecurityAction = (
    staff: AdministrationUser,
    action: SecurityAction,
  ) => {
    if (staff.id === currentUser?.id) {
      setError('You cannot perform this action on your own account.');
      return;
    }

    if (action === 'assignRole' && !canManageRoles) {
      setError('Role management permission is required.');
      return;
    }

    if (action !== 'assignRole' && !canManage) {
      setError('User management permission is required.');
      return;
    }

    setRetireReason('');
    setRetireConfirmation('');
    setSecurityUser(staff);
    setSecurityAction(action);
    setSelectedRole('');
    setRoleAssignmentMode('REPLACE');
    setTemporaryPassword('');
    setConfirmTemporaryPassword('');
    setSecurityError('');
    setSecurityOpen(true);
  };

  const confirmSecurityAction = async () => {
    if (!securityUser || securitySaving) return;

    if (securityUser.id === currentUser?.id) {
      setSecurityError(
        'You cannot perform this action on your own account.'
      );
      return;
    }

    if (securityAction === 'assignRole' && !canManageRoles) {
      setSecurityError('Role management permission is required.');
      return;
    }

    if (securityAction !== 'assignRole' && !canManage) {
      setSecurityError('User management permission is required.');
      return;
    }

    if (
      securityAction === 'assignRole' &&
      !roleOptions.some((role) => role.code === selectedRole)
    ) {
      setSecurityError('Select a valid role.');
      return;
    }

    if (securityAction === 'resetPassword') {
      if (
        temporaryPassword.length < 12 ||
        temporaryPassword.length > 128
      ) {
        setSecurityError(
          'Temporary password must contain 12 to 128 characters.'
        );
        return;
      }

      if (temporaryPassword !== confirmTemporaryPassword) {
        setSecurityError('Password confirmation does not match.');
        return;
      }
    }

    if (securityAction === 'retire') {
      if (retireReason.trim().length < 10) {
        setSecurityError('Provide a reason of at least 10 characters.');
        return;
      }
      if (retireConfirmation !== 'DELETE') {
        setSecurityError('Type DELETE to confirm account retirement.');
        return;
      }
    }

    setSecuritySaving(true);
    setSecurityError('');
    setSuccess('');

    try {
      if (securityAction === 'lock') {
        await administrationApi.lockUser(securityUser.id);

        setSuccess(
          `Account ${securityUser.username} locked successfully.`
        );
      } else if (securityAction === 'unlock') {
        await administrationApi.unlockUser(securityUser.id);

        setSuccess(
          `Account ${securityUser.username} unlocked successfully.`
        );
      } else if (securityAction === 'retire') {
        await administrationApi.retireUser(
          securityUser.id,
          retireReason.trim(),
          retireConfirmation,
        );
        setSuccess(`Account ${securityUser.username} retired successfully.`);
      } else if (securityAction === 'resetPassword') {
        await administrationApi.resetPassword(
          securityUser.id,
          temporaryPassword,
        );

        setTemporaryPassword('');
        setConfirmTemporaryPassword('');

        setSuccess(
          `Password reset successfully for ${securityUser.username}. The staff member must change it at next login.`
        );
      } else {
        const result = await administrationApi.assignRole(
          securityUser.id,
          {
            roleCode: selectedRole,
            mode: roleAssignmentMode,
          },
        );

        const responseMessage =
          result &&
          typeof result === 'object' &&
          'message' in result &&
          typeof result.message === 'string'
            ? result.message
            : roleAssignmentMode === 'ADD'
              ? 'Additional role assigned successfully'
              : 'Previous roles replaced successfully';

        setSuccess(
          `${securityUser.username}: ${responseMessage}`
        );
      }

      setSecurityOpen(false);
      setSecurityUser(null);
    } catch (err: unknown) {
      setSecurityError(errorMessage(err));
      return;
    } finally {
      setSecuritySaving(false);
    }

    await loadUsers();
  };
  const activeCount = users.filter(
    (staff) => accountStatus(staff) === 'ACTIVE',
  ).length;

  const lockedCount = users.filter(
    (staff) => accountStatus(staff) === 'LOCKED',
  ).length;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Administration
          </Typography>

          <Typography color="text.secondary">
            Wan Offi Clinic staff accounts and access management
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void loadUsers()}
            disabled={loading || !canRead}
          >
            Refresh
          </Button>

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={openCreate}
            >
              Add Staff
            </Button>
          )}
        </Stack>
      </Stack>

      {!canRead ? (
        <Alert severity="warning">
          Your account does not have permission to view staff users.
        </Alert>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setSuccess('')}
            >
              {success}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            {[
              { label: 'Total Users', value: users.length },
              { label: 'Active Accounts', value: activeCount },
              { label: 'Locked Accounts', value: lockedCount },
            ].map((item) => (
              <Card key={item.label} sx={{ flex: 1 }}>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <PeopleIcon color="primary" />
                    <Typography color="text.secondary">
                      {item.label}
                    </Typography>
                  </Stack>

                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                  mb: 2,
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', md: 'center' },
                }}
              >
                <Typography variant="h6">
                  Staff Directory
                </Typography>

                <TextField
                  size="small"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    py: 6,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Staff Member</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Roles</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {filteredUsers.map((staff) => {
                        const status = accountStatus(staff);

                        return (
                          <TableRow key={staff.id} hover>
                            <TableCell>{displayName(staff)}</TableCell>
                            <TableCell>{staff.username}</TableCell>
                            <TableCell>
                              {staff.email || staff.phone || '-'}
                            </TableCell>
                            <TableCell>{displayRoles(staff)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={status}
                                color={
                                  status === 'ACTIVE'
                                    ? 'success'
                                    : status === 'LOCKED'
                                      ? 'error'
                                      : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ flexWrap: 'wrap' }}
                              >
                                {canUpdate && (
                                  <Button
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => openEdit(staff)}
                                  >
                                    Edit
                                  </Button>
                                )}

                                {canManageRoles &&
                                  staff.id !== currentUser?.id && (
                                    <Button
                                      size="small"
                                      startIcon={<AdminPanelSettingsIcon />}
                                      onClick={() =>
                                        openSecurityAction(
                                          staff,
                                          'assignRole'
                                        )
                                      }
                                    >
                                      Assign Role
                                    </Button>
                                  )}

                                {canManage &&
                                  staff.id !== currentUser?.id &&
                                  status === 'ACTIVE' && (
                                    <Button
                                      size="small"
                                      color="primary"
                                      startIcon={<PasswordIcon />}
                                      onClick={() =>
                                        openSecurityAction(
                                          staff,
                                          'resetPassword'
                                        )
                                      }
                                    >
                                      Password Reset 
                                    </Button>
                                  )}

                                {canManage &&
                                  staff.id !== currentUser?.id &&
                                  status === 'ACTIVE' && (
                                    <Button
                                      size="small"
                                      color="error"
                                      startIcon={<LockIcon />}
                                      onClick={() =>
                                        openSecurityAction(staff, 'lock')
                                      }
                                    >
                                      Lock
                                    </Button>
                                  )}

                                {canManage &&
                                  staff.id !== currentUser?.id &&
                                  status === 'LOCKED' && (
                                    <Button
                                      size="small"
                                      color="success"
                                      startIcon={<LockOpenIcon />}
                                      onClick={() =>
                                        openSecurityAction(staff, 'unlock')
                                      }
                                    >
                                      Unlock
                                    </Button>
                                  )}

                                {canManage &&
                                  staff.id !== currentUser?.id &&
                                  status !== 'RETIRED' &&
                                  status !== 'DELETED' && (
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      onClick={() =>
                                        openSecurityAction(staff, 'retire')
                                      }
                                    >
                                      Delete User
                                    </Button>
                                  )}

                                {!canUpdate &&
                                  !canManage &&
                                  !canManageRoles && (
                                    <Typography variant="caption">
                                      Read only
                                    </Typography>
                                  )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No staff accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={securityOpen}
        onClose={() => {
          if (!securitySaving) setSecurityOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {securityAction === 'lock'
            ? 'Confirm Account Lock'
            : securityAction === 'retire'
              ? 'Confirm Delete User'
            : securityAction === 'unlock'
              ? 'Confirm Account Unlock'
              : securityAction === 'resetPassword'
                ? 'Reset Staff Password'
                : 'Assign Staff Role'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {securityError && (
              <Alert severity="error">
                {securityError}
              </Alert>
            )}

            <Typography>
              Staff: <strong>{securityUser?.username}</strong>
            </Typography>

            {securityAction === 'retire' && (
              <>
                <Alert severity="warning">
                  This will retire the staff account and revoke its access.
                  The backend prevents self-retirement and retirement of
                  the last required administrator.
                </Alert>
                <TextField
                  label="Reason for deletion"
                  multiline
                  minRows={2}
                  fullWidth
                  required
                  value={retireReason}
                  onChange={(event) => setRetireReason(event.target.value)}
                />
                <TextField
                  label="Type DELETE to confirm"
                  fullWidth
                  required
                  value={retireConfirmation}
                  onChange={(event) =>
                    setRetireConfirmation(event.target.value)
                  }
                />
              </>
            )}

            {securityAction === 'lock' && (
              <Alert severity="warning">
                This will lock the selected account and prevent
                the staff member from accessing PIMS.

                The backend prevents locking the last active
                privileged administrator.
              </Alert>
            )}

            {securityAction === 'unlock' && (
              <Alert severity="info">
                This will restore ACTIVE account status and
                reset failed login attempts.
              </Alert>
            )}

            {securityAction === 'resetPassword' && (
              <>
                <Alert severity="warning">
                  This action revokes the staff member's active sessions.
                  They must change the temporary password at next login.
                </Alert>

                <TextField
                  fullWidth
                  required
                  type="password"
                  label="Temporary Password"
                  value={temporaryPassword}
                  onChange={(event) =>
                    setTemporaryPassword(event.target.value)
                  }
                  disabled={securitySaving}
                  slotProps={{
                    htmlInput: {
                      minLength: 12,
                      maxLength: 128,
                      autoComplete: 'new-password',
                    },
                  }}
                />

                <TextField
                  fullWidth
                  required
                  type="password"
                  label="Confirm Temporary Password"
                  value={confirmTemporaryPassword}
                  onChange={(event) =>
                    setConfirmTemporaryPassword(event.target.value)
                  }
                  disabled={securitySaving}
                  slotProps={{
                    htmlInput: {
                      minLength: 12,
                      maxLength: 128,
                      autoComplete: 'new-password',
                    },
                  }}
                />
              </>
            )}

            {securityAction === 'assignRole' && (
              <>
                <Alert severity="info">
                  Current roles: {securityUser
                    ? displayRoles(securityUser)
                    : 'Unavailable'}
                </Alert>

                <TextField
                  select
                  fullWidth
                  label="Assignment mode"
                  value={roleAssignmentMode}
                  onChange={(event) =>
                    setRoleAssignmentMode(
                      event.target.value as RoleAssignmentMode
                    )
                  }
                  disabled={securitySaving}
                >
                  <MenuItem value="REPLACE">
                    REPLACE - Remove previous roles
                  </MenuItem>
                  <MenuItem value="ADD">
                    ADD - Keep existing roles
                  </MenuItem>
                </TextField>

                <Alert
                  severity={
                    roleAssignmentMode === 'REPLACE'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {roleAssignmentMode === 'REPLACE'
                    ? 'The selected role will replace all previous role assignments. Active sessions will be revoked when a change is made.'
                    : 'The selected role will be added without removing existing roles. Active sessions will be revoked when a change is made.'}
                </Alert>

                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={selectedRole}
                  onChange={(event) =>
                    setSelectedRole(event.target.value)
                  }
                  disabled={securitySaving}
                >
                  {roleOptions.map((role) => (
                    <MenuItem
                      key={role.code}
                      value={role.code}
                    >
                      {role.label}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setSecurityOpen(false)}
            disabled={securitySaving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={
              securityAction === 'lock'
                ? 'error'
                : 'primary'
            }
            disabled={
              securitySaving ||
              (
                securityAction === 'assignRole' &&
                !selectedRole
              )
            }
            onClick={() => void confirmSecurityAction()}
          >
            {securitySaving
              ? 'Processing...'
              : securityAction === 'retire'
                ? 'Confirm Delete User'
              : securityAction === 'lock'
                ? 'Confirm Lock'
            : securityAction === 'unlock'
                  ? 'Confirm Unlock'
                  : securityAction === 'resetPassword'
                    ? 'Confirm Password Reset'
                    : 'Assign Role'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!saving) setDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === 'create'
            ? 'Register Staff Account'
            : 'Edit Staff Account'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            {dialogMode === 'create' && (
              <>
                <TextField
                  label="Username"
                  required
                  value={form.username}
                  onChange={(event) =>
                    updateField('username', event.target.value)
                  }
                  disabled={saving}
                  fullWidth
                />

                <TextField
                  label="Password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(event) =>
                    updateField('password', event.target.value)
                  }
                  disabled={saving}
                  fullWidth
                />
              </>
            )}

            <TextField
              label="First Name"
              required
              value={form.firstName}
              onChange={(event) =>
                updateField('firstName', event.target.value)
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Middle Name"
              value={form.middleName}
              onChange={(event) =>
                updateField('middleName', event.target.value)
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Last Name"
              required
              value={form.lastName}
              onChange={(event) =>
                updateField('lastName', event.target.value)
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField('email', event.target.value)
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              label="Phone"
              value={form.phone}
              onChange={(event) =>
                updateField('phone', event.target.value)
              }
              disabled={saving}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => void saveStaff()}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : dialogMode === 'create'
                ? 'Create Account'
                : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
