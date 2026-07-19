import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/db';

// Real end-to-end coverage through the actual Express app (middleware,
// validation, RBAC, and Prisma) against a real Postgres — complements the
// pure-logic unit tests in ../../utils/*.test.ts, which never touch a DB.
const app = createApp();

const testEmail = `integration-test-${Date.now()}@example.com`;
const testPassword = 'IntegrationTest123!';

describe('Auth API (integration)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('rejects registration with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'not-an-email', password: testPassword, role: 'FAN' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects self-registration as a privileged role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword, role: 'SUPER_ADMIN' });

    expect(res.status).toBe(400);
  });

  it('registers a new Fan account and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword, role: 'FAN' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('FAN');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('rejects a duplicate registration with the same email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword, role: 'FAN' });

    expect(res.status).toBe(409);
  });

  it('rejects login with the wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects /auth/me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for /auth/me with a valid token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });
    const token = login.body.data.accessToken;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
  });

  it('enforces RBAC: a Fan cannot create a tournament', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });
    const token = login.body.data.accessToken;

    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Not Be Created', sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });

    expect(res.status).toBe(403);
  });

  it('rotates the refresh token on use, and issues a fresh working pair', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });
    const oldRefreshToken = login.body.data.refreshToken;

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.refreshToken).not.toBe(oldRefreshToken);
  });

  it('detects refresh-token reuse and revokes every session for the account', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: testEmail, password: testPassword });
    const originalRefreshToken = login.body.data.refreshToken;

    // First use rotates it away (this is the legitimate client).
    const firstUse = await request(app).post('/api/auth/refresh').send({ refreshToken: originalRefreshToken });
    expect(firstUse.status).toBe(200);
    const rotatedRefreshToken = firstUse.body.data.refreshToken;

    // Reusing the now-stale token simulates an attacker replaying a leaked one.
    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken: originalRefreshToken });
    expect(replay.status).toBe(401);

    // The theft response revokes ALL sessions — even the legitimate client's
    // just-rotated token should no longer work.
    const afterTheftResponse = await request(app).post('/api/auth/refresh').send({ refreshToken: rotatedRefreshToken });
    expect(afterTheftResponse.status).toBe(401);
  });
});
