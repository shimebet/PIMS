export interface PatientRequestContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}