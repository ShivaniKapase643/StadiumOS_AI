import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from './api';
import { login, register, forgotPassword, resetPassword, logout, getMe } from './auth.service';

describe('auth.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login posts credentials and unwraps the token pair', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' } } });
    const result = await login('fan@example.com', 'Password123!');
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'fan@example.com', password: 'Password123!' });
    expect(result.accessToken).toBe('a');
  });

  it('register posts the signup payload as-is', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' } } });
    const input = { name: 'Jai', email: 'jai@example.com', password: 'Password123!', role: 'FAN' as const };
    await register(input);
    expect(api.post).toHaveBeenCalledWith('/auth/register', input);
  });

  it('forgotPassword posts just the email', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { message: 'sent' } } });
    await forgotPassword('fan@example.com');
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'fan@example.com' });
  });

  it('resetPassword posts the token and new password', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { message: 'reset' } } });
    await resetPassword('reset-token', 'NewPassword123!');
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { token: 'reset-token', newPassword: 'NewPassword123!' });
  });

  it('logout posts the refresh token to revoke it', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await logout('refresh-token-value');
    expect(api.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-token-value' });
  });

  it('getMe fetches and unwraps the current user', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { id: 'u1', role: 'FAN' } } });
    const user = await getMe();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(user.role).toBe('FAN');
  });
});
