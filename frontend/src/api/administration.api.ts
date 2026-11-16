import { api } from './client';

import type {
  AdministrationUser,
  CreateAdministrationUser,
  UpdateAdministrationUser,
  AssignAdministrationRole,
  AuditQuery,
  AuditListResponse,
  UserListResponse,
} from '../types/administration';

export const administrationApi = {
  async listUsers(): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>('/users');
    return response.data;
  },

  async getUser(id: string): Promise<AdministrationUser> {
    const response = await api.get<AdministrationUser>(
      `/users/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async createUser(
    data: CreateAdministrationUser,
  ): Promise<AdministrationUser> {
    const response = await api.post<AdministrationUser>(
      '/users',
      data,
    );
    return response.data;
  },

  async updateUser(
    id: string,
    data: UpdateAdministrationUser,
  ): Promise<AdministrationUser> {
    const response = await api.patch<AdministrationUser>(
      `/users/${encodeURIComponent(id)}`,
      data,
    );
    return response.data;
  },

  async resetPassword(
    id: string,
    newPassword: string,
  ): Promise<{
    message: string;
    userId: string;
    mustChangePassword: boolean;
  }> {
    const response = await api.post<{
      message: string;
      userId: string;
      mustChangePassword: boolean;
    }>(
      `/users/${encodeURIComponent(id)}/reset-password`,
      { newPassword },
    );

    return response.data;
  },
  async retireUser(
    id: string,
    reason: string,
    confirmation: string,
  ): Promise<unknown> {
    const response = await api.post(
      `/users/${encodeURIComponent(id)}/retire`,
      { reason, confirmation },
    );
    return response.data;
  },
  async lockUser(id: string): Promise<AdministrationUser> {
    const response = await api.post<AdministrationUser>(
      `/users/${encodeURIComponent(id)}/lock`,
    );
    return response.data;
  },

  async unlockUser(id: string): Promise<AdministrationUser> {
    const response = await api.post<AdministrationUser>(
      `/users/${encodeURIComponent(id)}/unlock`,
    );
    return response.data;
  },

  async assignRole(
    id: string,
    data: AssignAdministrationRole,
  ): Promise<unknown> {
    const response = await api.post(
      `/users/${encodeURIComponent(id)}/roles`,
      data,
    );
    return response.data;
  },

  async listAudit(
    query: AuditQuery = {},
  ): Promise<AuditListResponse> {
    const response = await api.get<AuditListResponse>(
      '/audit',
      { params: query },
    );
    return response.data;
  },

  async getUserAudit(
    userId: string,
    query: Pick<AuditQuery, 'page' | 'limit'> = {},
  ): Promise<AuditListResponse> {
    const response = await api.get<AuditListResponse>(
      `/audit/user/${encodeURIComponent(userId)}`,
      { params: query },
    );
    return response.data;
  },
};
