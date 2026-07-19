import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./auth.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as authService from './auth.service';

const app = createApp();

describe('auth.routes (Supertest, mocked service)', () => {
  it('rejects registration with a password missing complexity requirements (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'alllowercase', role: 'FAN' });
    expect(res.status).toBe(400);
  });

  it('rejects self-registration as a privileged role not in the public signup list (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'ValidPass123!', role: 'SUPER_ADMIN' });
    expect(res.status).toBe(400);
  });

  it('registers a valid Fan account (201)', async () => {
    vi.mocked(authService.register).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com', role: 'FAN' },
      accessToken: 'a',
      refreshToken: 'r',
    } as never);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'ValidPass123!', role: 'FAN' });
    expect(res.status).toBe(201);
  });

  it('rejects login with a malformed email (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
  });

  it('propagates a 401 for wrong credentials from the service layer', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(authService.login).mockRejectedValue(ApiError.unauthorized('Invalid email or password'));
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in successfully', async () => {
    vi.mocked(authService.login).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' } as never);
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'ValidPass123!' });
    expect(res.status).toBe(200);
  });

  it('rejects a refresh request with a too-short token (400)', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'short' });
    expect(res.status).toBe(400);
  });

  it('refreshes a valid token pair', async () => {
    vi.mocked(authService.refresh).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a2', refreshToken: 'r2' } as never);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'a-long-enough-refresh-token' });
    expect(res.status).toBe(200);
  });

  it('logs out (revokes the refresh token)', async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'a-long-enough-refresh-token' });
    expect(res.status).toBe(200);
  });

  it('always returns 200 for forgot-password, even for a non-existent email (no account enumeration)', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(undefined);
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
  });

  it('rejects a password reset with a weak new password (400)', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'a-long-enough-token', newPassword: 'weak' });
    expect(res.status).toBe(400);
  });

  it('requires auth for /auth/me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for /auth/me with a valid token', async () => {
    vi.mocked(authService.getMe).mockResolvedValue({ id: 'u1', email: 'test@example.com', role: 'FAN' } as never);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(Role.FAN)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@example.com');
  });
});
