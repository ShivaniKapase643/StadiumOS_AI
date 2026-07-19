import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./crowd-intelligence.service');
vi.mock('./prediction.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import { getCongestionOverview, getQueueMonitoring, getPeakHourAnalysis } from './crowd-intelligence.service';
import { predictCrowdRisk } from './prediction.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('crowd-intelligence.routes (Supertest, mocked service)', () => {
  it('requires auth for congestion data', async () => {
    const res = await request(app).get('/api/crowd-intelligence/congestion');
    expect(res.status).toBe(401);
  });

  it('returns congestion overview', async () => {
    vi.mocked(getCongestionOverview).mockResolvedValue([] as never);
    const res = await request(app).get('/api/crowd-intelligence/congestion').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns gate queue monitoring', async () => {
    vi.mocked(getQueueMonitoring).mockResolvedValue([] as never);
    const res = await request(app).get('/api/crowd-intelligence/queues').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns peak-hour analysis', async () => {
    vi.mocked(getPeakHourAnalysis).mockResolvedValue([] as never);
    const res = await request(app).get('/api/crowd-intelligence/peak-hours').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns the AI Predictive Risk Map for a stadium', async () => {
    vi.mocked(predictCrowdRisk).mockResolvedValue([{ zoneId: 'z1', confidencePct: 80 }] as never);
    const res = await request(app).get('/api/crowd-intelligence/predict/s1').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].confidencePct).toBe(80);
  });
});
