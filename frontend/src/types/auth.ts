
export interface AuthUser {
  id: string;
  username: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  facilityId: string | null;
  departmentId: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

