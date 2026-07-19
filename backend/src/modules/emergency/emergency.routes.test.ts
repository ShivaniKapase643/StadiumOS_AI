import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./emergency.service');
vi.mock('./aiResponse.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as emergencyService from './emergency.service';
import { generateIncidentActionPlan, simulateEvacuation } from './aiResponse.service';

const app = createApp();
const RESPONDER_TOKEN = tokenFor(Role.MEDICAL_TEAM);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('emergency.routes (Supertest, mocked service)', () => {
  it('rejects a Fan listing SOS alerts (RBAC — responders only)', async () => {
    const res = await request(app).get('/api/emergency/sos').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('allows any authenticated user (including a Fan) to raise an SOS alert', async () => {
    vi.mocked(emergencyService.createSosAlert).mockResolvedValue({ id: 'a1', type: 'MEDICAL' } as never);
    const res = await request(app).post('/api/emergency/sos').set('Authorization', `Bearer ${FAN_TOKEN}`).send({ type: 'MEDICAL' });
    expect(res.status).toBe(201);
  });

  it('rejects raising an SOS alert with an invalid type (400)', async () => {
    const res = await request(app).post('/api/emergency/sos').set('Authorization', `Bearer ${FAN_TOKEN}`).send({ type: 'NOT_A_TYPE' });
    expect(res.status).toBe(400);
  });

  it('dispatches an ambulance for a responder', async () => {
    vi.mocked(emergencyService.dispatchAmbulance).mockResolvedValue({ id: 'd1' } as never);
    const res = await request(app)
      .post('/api/emergency/sos/a1/dispatch')
      .set('Authorization', `Bearer ${RESPONDER_TOKEN}`)
      .send({ driverName: 'Sam' });
    expect(res.status).toBe(201);
  });

  it('resolves an SOS alert', async () => {
    vi.mocked(emergencyService.resolveSosAlert).mockResolvedValue({ id: 'a1', status: 'RESOLVED' } as never);
    const res = await request(app).post('/api/emergency/sos/a1/resolve').set('Authorization', `Bearer ${RESPONDER_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('generates an AI Incident Commander action plan', async () => {
    vi.mocked(generateIncidentActionPlan).mockResolvedValue({ alertId: 'a1', steps: [] } as never);
    const res = await request(app).get('/api/emergency/sos/a1/action-plan').set('Authorization', `Bearer ${RESPONDER_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('propagates a 404 when generating an action plan for a non-existent alert', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(generateIncidentActionPlan).mockRejectedValue(ApiError.notFound('SOS alert not found'));
    const res = await request(app).get('/api/emergency/sos/nope/action-plan').set('Authorization', `Bearer ${RESPONDER_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('runs the Smart Evacuation Simulator for a zone', async () => {
    vi.mocked(simulateEvacuation).mockResolvedValue({ fromZoneName: 'East Stand', fastest: {}, alternative: null } as never);
    const res = await request(app).get('/api/emergency/evacuation-simulate/z1').set('Authorization', `Bearer ${RESPONDER_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('lists evacuation plans', async () => {
    vi.mocked(emergencyService.listEvacuationPlans).mockResolvedValue([] as never);
    const res = await request(app).get('/api/emergency/evacuation-plans').set('Authorization', `Bearer ${RESPONDER_TOKEN}`);
    expect(res.status).toBe(200);
  });
});
