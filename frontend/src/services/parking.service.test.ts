import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { api } from './api';
import { getLots, getAnalytics, getMyReservations, createReservation, cancelReservation } from './parking.service';

describe('parking.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches parking lots', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 'l1' }] } });
    const lots = await getLots();
    expect(api.get).toHaveBeenCalledWith('/parking/lots');
    expect(lots).toHaveLength(1);
  });

  it('fetches parking analytics', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getAnalytics();
    expect(api.get).toHaveBeenCalledWith('/parking/analytics');
  });

  it("fetches the caller's own reservations", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await getMyReservations();
    expect(api.get).toHaveBeenCalledWith('/parking/reservations');
  });

  it('creates a reservation with the given payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'r1' } } });
    const input = { slotId: 's1', vehicleNumber: 'AB123', startTime: '2026-01-01T10:00:00Z' };
    await createReservation(input);
    expect(api.post).toHaveBeenCalledWith('/parking/reservations', input);
  });

  it('cancels a reservation by id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    await cancelReservation('r1');
    expect(api.delete).toHaveBeenCalledWith('/parking/reservations/r1');
  });
});
