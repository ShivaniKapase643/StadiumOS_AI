import { api } from './api';
import type { AuthUser } from '@/types';

interface TokenPairResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ data: TokenPairResponse }>('/auth/login', { email, password });
  return data.data;
}

export async function register(input: { name: string; email: string; password: string; phone?: string; role: 'FAN' | 'VOLUNTEER' | 'VENDOR' }) {
  const { data } = await api.post<{ data: TokenPairResponse }>('/auth/register', input);
  return data.data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<{ data: { message: string } }>('/auth/forgot-password', { email });
  return data.data;
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await api.post<{ data: { message: string } }>('/auth/reset-password', { token, newPassword });
  return data.data;
}

export async function logout(refreshToken: string) {
  await api.post('/auth/logout', { refreshToken });
}

export async function getMe() {
  const { data } = await api.get<{ data: AuthUser }>('/auth/me');
  return data.data;
}
