import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./maintenance.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as maintenanceService from './maintenance.service';

const app = createApp();
const MAINTENANCE_TOKEN = tokenFor(Role.MAINTENANCE_TEAM);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('maintenance.routes (Supertest, mocked service)', () => {
  it('rejects a Fan listing assets (RBAC)', async () => {
    const res = await request(app).get('/api/maintenance/assets').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('lists assets for a Maintenance Team member', async () => {
    vi.mocked(maintenanceService.listAssets).mockResolvedValue([] as never);
    const res = await request(app).get('/api/maintenance/assets').set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects creating a work order with an invalid priority (400)', async () => {
    const res = await request(app)
      .post('/api/maintenance/work-orders')
      .set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`)
      .send({ assetId: '11111111-1111-1111-1111-111111111111', title: 'Fix turnstile', priority: 'SUPER_URGENT' });
    expect(res.status).toBe(400);
  });

  it('creates a work order', async () => {
    vi.mocked(maintenanceService.createWorkOrder).mockResolvedValue({ id: 'w1' } as never);
    const res = await request(app)
      .post('/api/maintenance/work-orders')
      .set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`)
      .send({ assetId: '11111111-1111-1111-1111-111111111111', title: 'Fix turnstile', priority: 'HIGH' });
    expect(res.status).toBe(201);
  });

  it('updates work order status', async () => {
    vi.mocked(maintenanceService.updateWorkOrderStatus).mockResolvedValue({ id: 'w1', status: 'COMPLETED' } as never);
    const res = await request(app)
      .patch('/api/maintenance/work-orders/w1/status')
      .set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
  });

  it('rejects an inspection report with a score outside 0-100 (400)', async () => {
    const res = await request(app)
      .post('/api/maintenance/inspections')
      .set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`)
      .send({ assetId: '11111111-1111-1111-1111-111111111111', findings: 'Looks fine', score: 150 });
    expect(res.status).toBe(400);
  });

  it('files an inspection report', async () => {
    vi.mocked(maintenanceService.createInspectionReport).mockResolvedValue({ id: 'r1' } as never);
    const res = await request(app)
      .post('/api/maintenance/inspections')
      .set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`)
      .send({ assetId: '11111111-1111-1111-1111-111111111111', findings: 'Looks fine', score: 90 });
    expect(res.status).toBe(201);
  });

  it('returns latest predictive-maintenance predictions', async () => {
    vi.mocked(maintenanceService.listLatestPredictions).mockResolvedValue([] as never);
    const res = await request(app).get('/api/maintenance/predictions').set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('recomputes predictions (201)', async () => {
    vi.mocked(maintenanceService.recomputePredictions).mockResolvedValue([] as never);
    const res = await request(app).post('/api/maintenance/predictions/recompute').set('Authorization', `Bearer ${MAINTENANCE_TOKEN}`);
    expect(res.status).toBe(201);
  });
});
