
import { api } from './client';
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '../types/auth';

export const authApi = {
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
