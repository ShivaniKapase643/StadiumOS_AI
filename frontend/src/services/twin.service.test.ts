import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ api: { get: vi.fn(), patch: vi.fn() } }));

import { api } from './api';
import { getStadiumOverview, listZones, updateZoneStatus, getLiveSnapshot, getReplayTimeRange, getReplaySnapshot } from './twin.service';

describe('twin.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the stadium overview', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { id: 's1' } } });
    await getStadiumOverview();
    expect(api.get).toHaveBeenCalledWith('/twin/overview');
  });

  it('lists zones without a type filter when none is given', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await listZones('s1');
    expect(api.get).toHaveBeenCalledWith('/twin/stadiums/s1/zones', { params: undefined });
  });

  it('passes the type filter as a query param when given', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await listZones('s1', 'GATE');
    expect(api.get).toHaveBeenCalledWith('/twin/stadiums/s1/zones', { params: { type: 'GATE' } });
  });

  it('updates a zone status via PATCH', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { id: 'z1', status: 'CLOSED' } } });
    await updateZoneStatus('z1', 'CLOSED');
    expect(api.patch).toHaveBeenCalledWith('/twin/zones/z1/status', { status: 'CLOSED' });
  });

  it('fetches a live snapshot for a stadium', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { zones: [], parkingLots: [], equipment: [], activeAlerts: [] } } });
    await getLiveSnapshot('s1');
    expect(api.get).toHaveBeenCalledWith('/twin/stadiums/s1/live');
  });

  it('fetches the replay time range', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { earliest: null, latest: null } } });
    await getReplayTimeRange('s1');
    expect(api.get).toHaveBeenCalledWith('/twin/stadiums/s1/replay-range');
  });

  it('fetches a replay snapshot, serializing the timestamp to ISO', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { at: '2026-01-01T10:00:00.000Z', zones: [], recentEvents: [] } } });
    const at = new Date('2026-01-01T10:00:00.000Z');
    await getReplaySnapshot('s1', at);
    expect(api.get).toHaveBeenCalledWith('/twin/stadiums/s1/replay', { params: { at: '2026-01-01T10:00:00.000Z' } });
  });
});
