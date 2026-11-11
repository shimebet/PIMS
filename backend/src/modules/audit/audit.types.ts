export interface CreateAuditLogInput {
  userId?: string | null;

  eventType: string;
  action: string;

  resourceType?: string | null;
  resourceId?: string | null;
  patientId?: string | null;

  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;

  oldValues?: unknown;
  newValues?: unknown;

  success?: boolean;
  failureReason?: string | null;
}