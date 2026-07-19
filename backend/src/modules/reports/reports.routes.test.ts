import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./reports.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import { getReport, getFullEventReport } from './reports.service';

const app = createApp();
const ORGANIZER_TOKEN = tokenFor(Role.TOURNAMENT_ORGANIZER);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('reports.routes (Supertest, mocked service)', () => {
  it('rejects a Fan requesting the full event report (RBAC)', async () => {
    const res = await request(app).get('/api/reports/full-event-report').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('generates the AI Report Generator full event report', async () => {
    vi.mocked(getFullEventReport).mockResolvedValue({ generatedAt: new Date().toISOString(), sections: {}, aiInsights: [] } as never);
    const res = await request(app).get('/api/reports/full-event-report').set('Authorization', `Bearer ${ORGANIZER_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects an unknown report type (400)', async () => {
    const res = await request(app).get('/api/reports/not-a-real-type').set('Authorization', `Bearer ${ORGANIZER_TOKEN}`);
    expect(res.status).toBe(400);
    expect(getReport).not.toHaveBeenCalled();
  });

  it('returns a valid report type', async () => {
    vi.mocked(getReport).mockResolvedValue([] as never);
    const res = await request(app).get('/api/reports/attendance').set('Authorization', `Bearer ${ORGANIZER_TOKEN}`);
    expect(res.status).toBe(200);
    expect(getReport).toHaveBeenCalledWith('attendance');
  });
});
