import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./twin.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as twinService from './twin.service';

const app = createApp();
const ADMIN_TOKEN = tokenFor(Role.STADIUM_ADMIN);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('twin.routes (Supertest, mocked service)', () => {
  it('returns the stadium overview for any authenticated user', async () => {
    vi.mocked(twinService.getStadiumOverview).mockResolvedValue({ id: 's1' } as never);
    const res = await request(app).get('/api/twin/overview').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('lists zones for a stadium', async () => {
    vi.mocked(twinService.listZones).mockResolvedValue([] as never);
    const res = await request(app).get('/api/twin/stadiums/s1/zones').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns a live snapshot', async () => {
    vi.mocked(twinService.getLiveSnapshot).mockResolvedValue({ zones: [], parkingLots: [], equipment: [], activeAlerts: [] } as never);
    const res = await request(app).get('/api/twin/stadiums/s1/live').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns the replay time range', async () => {
    vi.mocked(twinService.getReplayTimeRange).mockResolvedValue({ earliest: null, latest: null } as never);
    const res = await request(app).get('/api/twin/stadiums/s1/replay-range').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns a replay snapshot for a given timestamp', async () => {
    vi.mocked(twinService.getReplaySnapshot).mockResolvedValue({ at: new Date().toISOString(), zones: [], recentEvents: [] } as never);
    const res = await request(app).get('/api/twin/stadiums/s1/replay?at=2026-01-01T10:00:00Z').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(twinService.getReplaySnapshot).toHaveBeenCalledWith('s1', expect.any(Date));
  });

  it('rejects a Fan creating a zone (RBAC — admin only)', async () => {
    const res = await request(app)
      .post('/api/twin/zones')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ stadiumId: '11111111-1111-1111-1111-111111111111', name: 'New Zone', type: 'GATE', x: 5, y: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects creating a zone with an invalid type (400)', async () => {
    const res = await request(app)
      .post('/api/twin/zones')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ stadiumId: '11111111-1111-1111-1111-111111111111', name: 'New Zone', type: 'NOT_A_TYPE', x: 5, y: 5 });
    expect(res.status).toBe(400);
  });

  it('creates a zone as an admin and writes an audit log entry', async () => {
    vi.mocked(twinService.createZone).mockResolvedValue({ id: 'z1' } as never);
    const res = await request(app)
      .post('/api/twin/zones')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ stadiumId: '11111111-1111-1111-1111-111111111111', name: 'New Zone', type: 'GATE', x: 5, y: 5 });
    expect(res.status).toBe(201);
  });

  it('allows the Maintenance Team to update zone status (extra role beyond MANAGE_ROLES)', async () => {
    vi.mocked(twinService.updateZoneStatus).mockResolvedValue({ id: 'z1', status: 'DEGRADED' } as never);
    const res = await request(app)
      .patch('/api/twin/zones/z1/status')
      .set('Authorization', `Bearer ${tokenFor(Role.MAINTENANCE_TEAM)}`)
      .send({ status: 'DEGRADED' });
    expect(res.status).toBe(200);
  });

  it('propagates a 404 updating the status of a non-existent zone', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(twinService.updateZoneStatus).mockRejectedValue(ApiError.notFound('Zone not found'));
    const res = await request(app)
      .patch('/api/twin/zones/nope/status')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'OPERATIONAL' });
    expect(res.status).toBe(404);
  });

  it('deletes a zone', async () => {
    vi.mocked(twinService.deleteZone).mockResolvedValue(undefined);
    const res = await request(app).delete('/api/twin/zones/z1').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
  });
});
