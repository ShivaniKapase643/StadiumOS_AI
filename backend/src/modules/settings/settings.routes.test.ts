import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('../../config/db', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('./settings.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import { prisma } from '../../config/db';
import * as settingsService from './settings.service';

const app = createApp();
const ADMIN_TOKEN = tokenFor(Role.SUPER_ADMIN);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('settings.routes (Supertest, mocked service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', organizationId: 'org-1' } as never);
  });

  it('rejects every settings route for an unauthenticated caller', async () => {
    const res = await request(app).get('/api/settings/organization');
    expect(res.status).toBe(401);
  });

  it('rejects a Fan (RBAC — admin only)', async () => {
    const res = await request(app).get('/api/settings/organization').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when the caller has no organization associated', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', organizationId: null } as never);
    const res = await request(app).get('/api/settings/organization').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(400);
  });

  it('gets organization details for an admin with an organization', async () => {
    vi.mocked(settingsService.getOrganization).mockResolvedValue({ id: 'org-1', name: 'Smart Stadium' } as never);
    const res = await request(app).get('/api/settings/organization').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Smart Stadium');
    expect(settingsService.getOrganization).toHaveBeenCalledWith('org-1');
  });

  it('rejects an invalid organization update body (400)', async () => {
    const res = await request(app)
      .patch('/api/settings/organization')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ logoUrl: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('lists users with pagination metadata', async () => {
    vi.mocked(settingsService.listUsers).mockResolvedValue({ items: [{ id: 'u1' }], total: 1, page: 1, pageSize: 20 } as never);
    const res = await request(app).get('/api/settings/users').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
  });

  it('rejects changing a role to a value outside the Role enum (400)', async () => {
    const res = await request(app)
      .patch('/api/settings/users/u2/role')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'NOT_A_REAL_ROLE' });
    expect(res.status).toBe(400);
  });

  it('rejects a Stadium Admin (not Super Admin) from changing roles (RBAC)', async () => {
    const res = await request(app)
      .patch('/api/settings/users/u2/role')
      .set('Authorization', `Bearer ${tokenFor(Role.STADIUM_ADMIN)}`)
      .send({ role: 'VOLUNTEER' });
    expect(res.status).toBe(403);
  });

  it('updates a user role and writes an audit log entry as a Super Admin', async () => {
    vi.mocked(settingsService.updateUserRole).mockResolvedValue({ id: 'u2', role: 'VOLUNTEER' } as never);
    const res = await request(app)
      .patch('/api/settings/users/u2/role')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'VOLUNTEER' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('VOLUNTEER');
  });

  it('propagates a 404 from the service layer when toggling a non-existent user', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(settingsService.toggleUserActive).mockRejectedValue(ApiError.notFound('User not found'));
    const res = await request(app)
      .patch('/api/settings/users/nope/active')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });

  it('creates an API key (201) and returns its raw value', async () => {
    vi.mocked(settingsService.createApiKey).mockResolvedValue({ id: 'k1', rawKey: 'sk_abc' } as never);
    const res = await request(app)
      .post('/api/settings/api-keys')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Integration key' });
    expect(res.status).toBe(201);
    expect(res.body.data.rawKey).toBe('sk_abc');
  });

  it('rejects creating an API key with a name that is too short (400)', async () => {
    const res = await request(app).post('/api/settings/api-keys').set('Authorization', `Bearer ${ADMIN_TOKEN}`).send({ name: 'x' });
    expect(res.status).toBe(400);
  });

  it('revokes an API key', async () => {
    vi.mocked(settingsService.revokeApiKey).mockResolvedValue({ id: 'k1', revokedAt: new Date() } as never);
    const res = await request(app).delete('/api/settings/api-keys/k1').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns paginated audit logs', async () => {
    vi.mocked(settingsService.getAuditLogs).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    const res = await request(app).get('/api/settings/audit-logs').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });
});
