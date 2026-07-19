import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./dashboard.service');
vi.mock('./healthScore.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as dashboardService from './dashboard.service';
import { getStadiumHealthScore } from './healthScore.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('dashboard.routes (Supertest, mocked service)', () => {
  it('requires auth for KPIs', async () => {
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(401);
  });

  it('returns KPIs for an authenticated user', async () => {
    vi.mocked(dashboardService.getKpis).mockResolvedValue({ attendance: { scanned: 0, totalIssued: 0 } } as never);
    const res = await request(app).get('/api/dashboard/kpis').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns the Stadium Command Mission Control health score', async () => {
    vi.mocked(getStadiumHealthScore).mockResolvedValue({ overall: 95, overallStatus: 'green' } as never);
    const res = await request(app).get('/api/dashboard/health-score').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.overall).toBe(95);
  });

  it('returns the attendance trend', async () => {
    vi.mocked(dashboardService.getAttendanceTrend).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/attendance-trend').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns the revenue trend', async () => {
    vi.mocked(dashboardService.getRevenueTrend).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/revenue-trend').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns crowd by zone', async () => {
    vi.mocked(dashboardService.getCrowdByZone).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/crowd-by-zone').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns the ticket tier split', async () => {
    vi.mocked(dashboardService.getTicketTierSplit).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/ticket-tier-split').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns upcoming matches', async () => {
    vi.mocked(dashboardService.getUpcomingMatches).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/upcoming-matches').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns recent activity', async () => {
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([] as never);
    const res = await request(app).get('/api/dashboard/recent-activity').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });
});
