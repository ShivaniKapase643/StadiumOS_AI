import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    energyReading: { findMany: vi.fn() },
    waterUsageReading: { findMany: vi.fn() },
    wasteRecord: { findMany: vi.fn() },
    carbonFootprintRecord: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getSustainabilitySummary } from './sustainability.service';

describe('getSustainabilitySummary (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.energyReading.findMany).mockResolvedValue([]);
    vi.mocked(prisma.waterUsageReading.findMany).mockResolvedValue([]);
    vi.mocked(prisma.carbonFootprintRecord.findMany).mockResolvedValue([]);
  });

  it('computes the recycling rate from recycled vs. total waste weight', async () => {
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([
      { weightKg: 100, recycled: true },
      { weightKg: 50, recycled: false },
      { weightKg: 50, recycled: true },
    ] as never);

    const summary = await getSustainabilitySummary('stadium-1');
    expect(summary.waste.totalKg).toBe(200);
    expect(summary.waste.recycledKg).toBe(150);
    expect(summary.waste.recyclingRatePct).toBe(75);
  });

  it('reports a 0% recycling rate without dividing by zero when there is no waste data yet', async () => {
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([]);
    const summary = await getSustainabilitySummary('stadium-1');
    expect(summary.waste.recyclingRatePct).toBe(0);
  });

  it('returns null for the latest reading of each category when no data exists yet', async () => {
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([]);
    const summary = await getSustainabilitySummary('stadium-1');
    expect(summary.energy.latest).toBeNull();
    expect(summary.water.latest).toBeNull();
    expect(summary.carbon.latest).toBeNull();
  });

  it('orders the trend series oldest-first for charting, even though it queries newest-first', async () => {
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.energyReading.findMany).mockResolvedValue([
      { recordedAt: new Date('2026-01-03'), consumptionKwh: 300, solarGenKwh: 50 },
      { recordedAt: new Date('2026-01-02'), consumptionKwh: 200, solarGenKwh: 40 },
      { recordedAt: new Date('2026-01-01'), consumptionKwh: 100, solarGenKwh: 30 },
    ] as never);

    const summary = await getSustainabilitySummary('stadium-1');
    expect(summary.energy.trend[0].consumptionKwh).toBe(100); // oldest first
    expect(summary.energy.trend[2].consumptionKwh).toBe(300); // newest last
    expect(summary.energy.latest?.consumptionKwh).toBe(300); // "latest" is still the newest reading
  });
});
