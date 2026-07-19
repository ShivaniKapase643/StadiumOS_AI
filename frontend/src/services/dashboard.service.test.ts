import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ api: { get: vi.fn() } }));

import { api } from './api';
import {
  getKpis,
  getHealthScore,
  getAttendanceTrend,
  getRevenueTrend,
  getCrowdByZone,
  getTicketTierSplit,
  getUpcomingMatches,
  getRecentActivity,
} from './dashboard.service';

describe('dashboard.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches KPIs from the correct endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { attendance: { scanned: 0, totalIssued: 0 } } } });
    await getKpis();
    expect(api.get).toHaveBeenCalledWith('/dashboard/kpis');
  });

  it('fetches the Mission Control health score', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { overall: 92, overallStatus: 'green' } } });
    const health = await getHealthScore();
    expect(api.get).toHaveBeenCalledWith('/dashboard/health-score');
    expect(health.overall).toBe(92);
  });

  it('fetches the attendance trend', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getAttendanceTrend();
    expect(api.get).toHaveBeenCalledWith('/dashboard/attendance-trend');
  });

  it('fetches the revenue trend', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getRevenueTrend();
    expect(api.get).toHaveBeenCalledWith('/dashboard/revenue-trend');
  });

  it('fetches crowd-by-zone data', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getCrowdByZone();
    expect(api.get).toHaveBeenCalledWith('/dashboard/crowd-by-zone');
  });

  it('fetches the ticket tier split', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getTicketTierSplit();
    expect(api.get).toHaveBeenCalledWith('/dashboard/ticket-tier-split');
  });

  it('fetches upcoming matches', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getUpcomingMatches();
    expect(api.get).toHaveBeenCalledWith('/dashboard/upcoming-matches');
  });

  it('fetches recent activity', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getRecentActivity();
    expect(api.get).toHaveBeenCalledWith('/dashboard/recent-activity');
  });
});
