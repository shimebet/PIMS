
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';

import type { RefreshResponse } from '../types/auth';

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    'http://localhost:3000/api/v1',
  timeout: 15000,
});

let accessToken: string | null = null;
let refreshToken: string | null = null;

let refreshPromise: Promise<string> | null = null;
let tokenVersion = 0;

export function setTokens(
  access: string,
  refresh: string,
) {
  accessToken = access;
  refreshToken = refresh;
  tokenVersion += 1;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  tokenVersion += 1;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getAccessToken() {
  return accessToken;
}

interface RetryableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;

  return /\/auth\/(login|refresh|logout)(?:[/?#]|$)/.test(
    url,
  );
}

// Attach the current access token to API requests.
api.interceptors.request.use((config) => {
  if (accessToken && !isAuthEndpoint(config.url)) {
    config.headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    );
  }

  return config;
});

// Use a separate client for refresh requests to avoid
// recursive interceptor calls.
const refreshClient = axios.create({
  baseURL: api.defaults.baseURL,
  timeout: 15000,
});

async function renewAccessToken(): Promise<string> {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  if (!refreshPromise) {
    const currentRefreshToken = refreshToken;
    const versionAtStart = tokenVersion;

    const pending = refreshClient
      .post<RefreshResponse>(
        '/auth/refresh',
        {
          refreshToken: currentRefreshToken,
        },
      )
      .then((response) => {
        // Do not restore credentials if logout or
        // another login occurred during refresh.
        if (tokenVersion !== versionAtStart) {
          throw new Error(
            'Authentication session changed',
          );
        }

        const tokens = response.data;

        if (
          !tokens.accessToken ||
          !tokens.refreshToken
        ) {
          throw new Error(
            'Invalid token refresh response',
          );
        }

        setTokens(
          tokens.accessToken,
          tokens.refreshToken,
        );

        return tokens.accessToken;
      })
      .catch((error: unknown) => {
        // Do not clear a newer login session.
        if (tokenVersion === versionAtStart) {
          clearTokens();
        }

        throw error;
      });

    refreshPromise = pending;

    void pending.finally(() => {
      if (refreshPromise === pending) {
        refreshPromise = null;
      }
    }).catch(() => {
      // The original request handles the failure.
    });
  }

  return refreshPromise;
}

// Refresh an expired access token and retry once.
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken =
        await renewAccessToken();

      originalRequest.headers =
        AxiosHeaders.from(originalRequest.headers);

      originalRequest.headers.set(
        'Authorization',
        `Bearer ${newAccessToken}`,
      );

      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
