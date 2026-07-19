import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

// app.ts wires every module's routes in one place — mocking each module's
// service layer here means createApp() can be exercised end-to-end (real
// middleware stack: helmet, cors, rate limiting, auth, rbac, validate,
// errorHandler) without a live database. Individual route behavior is
// covered in each module's own *.routes.test.ts; this file targets app.ts
// itself plus the shared middleware every route passes through.
vi.mock('./modules/dashboard/dashboard.service', () => ({ getKpis: vi.fn().mockResolvedValue({}) }));

import { createApp } from './app';
import { tokenFor } from './test-helpers/authToken';
import { getKpis } from './modules/dashboard/dashboard.service';

const app = createApp();

describe('createApp (unit) — app.ts + shared middleware', () => {
  it('serves /health without requiring auth or touching any route module', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', timestamp: expect.any(String) });
  });

  it('applies Helmet security headers to every response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('returns a JSON 404 for an unknown route instead of Express\'s default HTML page', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found: GET /api/this-route-does-not-exist' });
  });

  it('mounts the Swagger docs UI at /api/docs', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  describe('requireAuth middleware (via a real protected route)', () => {
    it('rejects a request with no Authorization header at all', async () => {
      const res = await request(app).get('/api/dashboard/kpis');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Missing or malformed');
    });

    it('rejects a malformed Authorization header (not "Bearer <token>")', async () => {
      const res = await request(app).get('/api/dashboard/kpis').set('Authorization', 'Token abc123');
      expect(res.status).toBe(401);
    });

    it('rejects a syntactically-invalid bearer token', async () => {
      const res = await request(app).get('/api/dashboard/kpis').set('Authorization', 'Bearer not-a-real-jwt');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('accepts a validly-signed token and reaches the route handler', async () => {
      const res = await request(app).get('/api/dashboard/kpis').set('Authorization', `Bearer ${tokenFor(Role.SUPER_ADMIN)}`);
      expect(res.status).toBe(200);
    });
  });

  describe('errorHandler middleware (via a route that throws)', () => {
    it('converts an unexpected thrown error into a generic 500 without leaking internals', async () => {
      vi.mocked(getKpis).mockRejectedValueOnce(new Error('boom: a raw database driver error message'));

      const res = await request(app).get('/api/dashboard/kpis').set('Authorization', `Bearer ${tokenFor(Role.SUPER_ADMIN)}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, message: 'Internal server error' });
      expect(JSON.stringify(res.body)).not.toContain('boom');
    });
  });
});
