
import { api } from './client';
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '../types/auth';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface UpdateProfileRequest {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export const authApi = {
  async getProfile() {
    const response = await api.get<UserProfile>(
      '/auth/profile',
    );

    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest) {
    const response = await api.patch<UserProfile>(
      '/auth/profile',
      data,
    );

    return response.data;
  },

  async changePassword(data: ChangePasswordRequest) {
    const response = await api.post<{ message: string }>(
      '/auth/change-password',
      data,
    );

    return response.data;
  },

  async login(data: LoginRequest) {
    const response = await api.post<LoginResponse>(
      '/auth/login',
      data,
    );

    return response.data;
  },

  async refresh(refreshToken: string) {
    const response = await api.post<RefreshResponse>(
      '/auth/refresh',
      { refreshToken },
    );

    return response.data;
  },

  async me() {
    const response = await api.get<AuthUser>(
      '/auth/me',
    );

    return response.data;
  },

  async logout() {
    const response = await api.post<{
      message: string;
    }>('/auth/logout');

    return response.data;
  },
};
