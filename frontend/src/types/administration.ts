export interface AdministrationUser {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  firstName: string | null;
  middleName?: string | null;
  lastName: string | null;
  facilityId?: string | null;
  departmentId?: string | null;
  status?: string;
  isLocked?: boolean;
  roles?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdministrationUser {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  middleName?: string;
  facilityId?: string;
  departmentId?: string;
}

export interface UpdateAdministrationUser {
  email?: string;
  phone?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  facilityId?: string;
  departmentId?: string;
}

export type RoleAssignmentMode = 'REPLACE' | 'ADD';

export interface AssignAdministrationRole {
  roleCode: string;
  mode?: RoleAssignmentMode;
}

export interface AuditEntry {
  id: string;
  userId?: string | null;
  eventType?: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  success?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  occurredAt?: string;
  patientId?: string | null;
  requestId?: string | null;
  failureReason?: string | null;
  user?: AuditActor | null;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  action?: string;
  eventType?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export type UserListResponse =
  | AdministrationUser[]
  | PaginatedResult<AdministrationUser>;

export interface AuditActor {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditListResponse {
  items: AuditEntry[];
  pagination: AuditPagination;
}