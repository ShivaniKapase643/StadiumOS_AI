import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'stadium_os_access_token';
const REFRESH_TOKEN_KEY = 'stadium_os_refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await axios.post(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = response.data.data;
  tokenStorage.setTokens(accessToken, newRefreshToken);
  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && tokenStorage.getRefresh()) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? performRefresh();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
