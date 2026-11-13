import { api } from './client';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  facilityId: string;
  departmentId: string | null;
  practitionerId: string | null;
  appointmentType: string | null;
  reason: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  status: AppointmentStatus;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  facilityId: string;
  departmentId?: string;
  practitionerId?: string;
  appointmentType?: string;
  reason?: string;
  scheduledStart: string;
  scheduledEnd?: string;
  notes?: string;
}

export interface AppointmentSearchParams {
  search?: string;
  patientId?: string;
  departmentId?: string;
  practitionerId?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  reason?: string;
}

export interface RescheduleAppointmentRequest {
  scheduledStart: string;
  scheduledEnd?: string;
}

export const appointmentsApi = {
  async list(
    params: AppointmentSearchParams = {},
  ): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>(
      '/appointments',
      { params },
    );

    return response.data;
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(
      `/appointments/${encodeURIComponent(id)}`,
    );

    return response.data;
  },

  async create(
    data: CreateAppointmentRequest,
  ): Promise<Appointment> {
    const response = await api.post<Appointment>(
      '/appointments',
      data,
    );

    return response.data;
  },

  async updateStatus(
    id: string,
    data: UpdateAppointmentStatusRequest,
  ): Promise<Appointment> {
    const response = await api.patch<Appointment>(
      `/appointments/${encodeURIComponent(id)}/status`,
      data,
    );

    return response.data;
  },

  async reschedule(
    id: string,
    data: RescheduleAppointmentRequest,
  ): Promise<Appointment> {
    const response = await api.patch<Appointment>(
      `/appointments/${encodeURIComponent(id)}/reschedule`,
      data,
    );

    return response.data;
  },
};