import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    ticket: { count: vi.fn() },
    payment: { aggregate: vi.fn() },
    crowdDensityReading: { findMany: vi.fn() },
    parkingSlot: { count: vi.fn() },
    energyReading: { findFirst: vi.fn() },
    incident: { count: vi.fn() },
    sOSAlert: { count: vi.fn() },
    workOrder: { count: vi.fn() },
    weatherSnapshot: { findFirst: vi.fn() },
    fixture: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    stadiumZone: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getKpis, getCrowdByZone, getUpcomingMatches } from './dashboard.service';

function mockBase() {
  vi.mocked(prisma.ticket.count).mockResolvedValueOnce(40).mockResolvedValueOnce(50); // scanned, totalIssued
  vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: 1250.5 } } as never);
  vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.parkingSlot.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
  vi.mocked(prisma.energyReading.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.incident.count).mockResolvedValue(0);
  vi.mocked(prisma.sOSAlert.count).mockResolvedValue(0);
  vi.mocked(prisma.workOrder.count).mockResolvedValue(0);
  vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue(null);
}

describe('dashboard.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('computes attendance from scanned vs. total-issued ticket counts', async () => {
    mockBase();
    const kpis = await getKpis();
    expect(kpis.attendance).toEqual({ scanned: 40, totalIssued: 50 });
  });

  it('defaults revenue to 0 when there are no successful payments yet', async () => {
    mockBase();
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { amount: null } } as never);
    const kpis = await getKpis();
    expect(kpis.revenue.totalCollected).toBe(0);
  });

  it('averages capacity across recent crowd readings, rounded to one decimal', async () => {
    mockBase();
    vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([{ capacityPct: 50 }, { capacityPct: 51 }, { capacityPct: 52 }] as never);
    const kpis = await getKpis();
    expect(kpis.crowd.averageCapacityPct).toBe(51);
  });

  it('computes parking occupancy percentage from occupied/total slot counts', async () => {
    mockBase();
    vi.mocked(prisma.parkingSlot.count).mockReset().mockResolvedValueOnce(80).mockResolvedValueOnce(20);
    const kpis = await getKpis();
    expect(kpis.parking).toEqual({ totalSlots: 80, occupied: 20, occupancyPct: 25 });
  });

  it('returns null weather when no snapshot has been recorded yet', async () => {
    mockBase();
    const kpis = await getKpis();
    expect(kpis.weather).toBeNull();
  });

  it('getCrowdByZone omits zones with no crowd reading yet', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { name: 'Zone A', crowdReadings: [{ capacityPct: 60, densityLevel: 'MODERATE' }] },
      { name: 'Zone B', crowdReadings: [] },
    ] as never);

    const result = await getCrowdByZone();
    expect(result).toHaveLength(1);
    expect(result[0].zoneName).toBe('Zone A');
  });

  it('getUpcomingMatches only queries fixtures scheduled from now onward', async () => {
    vi.mocked(prisma.fixture.findMany).mockResolvedValue([]);
    await getUpcomingMatches();
    const callArgs = vi.mocked(prisma.fixture.findMany).mock.calls[0][0];
    expect(callArgs?.where?.scheduledAt).toHaveProperty('gte');
  });
});
