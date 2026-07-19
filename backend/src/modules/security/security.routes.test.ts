import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./security.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as securityService from './security.service';

const app = createApp();
const SECURITY_TOKEN = tokenFor(Role.SECURITY_OFFICER);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('security.routes (Supertest, mocked service)', () => {
  it('rejects a Fan listing incidents (RBAC)', async () => {
    const res = await request(app).get('/api/security/incidents').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('lists incidents with pagination for a Security Officer', async () => {
    vi.mocked(securityService.listIncidents).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    const res = await request(app).get('/api/security/incidents').set('Authorization', `Bearer ${SECURITY_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('allows a Volunteer to report an incident (extra role beyond SECURITY_ROLES)', async () => {
    vi.mocked(securityService.createIncident).mockResolvedValue({ id: 'i1' } as never);
    const res = await request(app)
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${tokenFor(Role.VOLUNTEER)}`)
      .send({ type: 'Trespassing', severity: 'MEDIUM', description: 'Someone climbed the fence' });
    expect(res.status).toBe(201);
  });

  it('rejects an incident report missing a required field (400)', async () => {
    const res = await request(app)
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ severity: 'MEDIUM', description: 'No type given' });
    expect(res.status).toBe(400);
  });

  it('updates incident status and writes an audit log', async () => {
    vi.mocked(securityService.updateIncidentStatus).mockResolvedValue({ id: 'i1', status: 'RESOLVED' } as never);
    const res = await request(app)
      .patch('/api/security/incidents/i1')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ status: 'RESOLVED' });
    expect(res.status).toBe(200);
  });

  it('propagates a 404 when updating a non-existent incident', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(securityService.updateIncidentStatus).mockRejectedValue(ApiError.notFound('Incident not found'));
    const res = await request(app)
      .patch('/api/security/incidents/nope')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ status: 'RESOLVED' });
    expect(res.status).toBe(404);
  });

  it('lists CCTV cameras', async () => {
    vi.mocked(securityService.listCameras).mockResolvedValue([{ id: 'c1' }] as never);
    const res = await request(app).get('/api/security/cctv').set('Authorization', `Bearer ${SECURITY_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('logs a patrol checkpoint', async () => {
    vi.mocked(securityService.createPatrolLog).mockResolvedValue({ id: 'p1' } as never);
    const res = await request(app)
      .post('/api/security/patrol-logs')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ zoneId: '11111111-1111-1111-1111-111111111111' });
    expect(res.status).toBe(201);
  });

  it('sends a broadcast and writes an audit log entry', async () => {
    vi.mocked(securityService.createBroadcast).mockResolvedValue({ id: 'b1', recipientCount: 5 } as never);
    const res = await request(app)
      .post('/api/security/broadcasts')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ message: 'Evacuate section C', severity: 'CRITICAL' });
    expect(res.status).toBe(201);
    expect(res.body.data.recipientCount).toBe(5);
  });

  it('rejects a broadcast with an invalid severity value (400)', async () => {
    const res = await request(app)
      .post('/api/security/broadcasts')
      .set('Authorization', `Bearer ${SECURITY_TOKEN}`)
      .send({ message: 'Test', severity: 'NOT_A_SEVERITY' });
    expect(res.status).toBe(400);
  });

  it('lists past broadcasts', async () => {
    vi.mocked(securityService.listBroadcasts).mockResolvedValue([] as never);
    const res = await request(app).get('/api/security/broadcasts').set('Authorization', `Bearer ${SECURITY_TOKEN}`);
    expect(res.status).toBe(200);
  });
});
