
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import { authApi } from '../api/auth.api';
import {
  clearTokens,
  setTokens,
} from '../api/client';

import type {
  AuthUser,
  LoginRequest,
} from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(
    null,
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      clearTokens();
      setUser(null);

      const result = await authApi.login(credentials);

      setTokens(
        result.accessToken,
        result.refreshToken,
      );

      setUser(result.user);
    },
    [],
  );

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      clearSession,
    }),
    [user, login, logout, clearSession],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
