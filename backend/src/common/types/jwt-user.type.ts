export interface JwtUser {
  userId: string;
  username: string;
  facilityId: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}
