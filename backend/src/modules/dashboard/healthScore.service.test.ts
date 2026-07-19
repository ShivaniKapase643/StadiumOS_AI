import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    incident: { count: vi.fn() },
    sOSAlert: { count: vi.fn() },
    workOrder: { count: vi.fn() },
    crowdDensityReading: { findMany: vi.fn() },
    parkingSlot: { count: vi.fn() },
    energyReading: { findFirst: vi.fn() },
  },
}));
vi.mock('../ai/insights.service', () => ({ generateInsights: vi.fn() }));

import { prisma } from '../../config/db';
import { generateInsights } from '../ai/insights.service';
import { getStadiumHealthScore } from './healthScore.service';

function mockAllClear() {
  vi.mocked(prisma.incident.count).mockResolvedValue(0);
  vi.mocked(prisma.sOSAlert.count).mockResolvedValue(0);
  vi.mocked(prisma.workOrder.count).mockResolvedValue(0);
  vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([{ capacityPct: 40 }] as never);
  vi.mocked(prisma.parkingSlot.count).mockResolvedValueOnce(100).mockResolvedValueOnce(20);
  vi.mocked(prisma.energyReading.findFirst).mockResolvedValue({ consumptionKwh: 1000, solarGenKwh: 500 } as never);
  vi.mocked(generateInsights).mockResolvedValue([]);
}

describe('getStadiumHealthScore (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scores a fully nominal stadium in the green', async () => {
    mockAllClear();
    const health = await getStadiumHealthScore();
    expect(health.overallStatus).toBe('green');
    expect(health.overall).toBeGreaterThanOrEqual(90);
    expect(health.categories.security.status).toBe('green');
  });

  it('drags the security category down as open incidents accumulate', async () => {
    mockAllClear();
    vi.mocked(prisma.incident.count).mockResolvedValue(5); // 5 * 8 = 40 point penalty
    const health = await getStadiumHealthScore();
    expect(health.categories.security.score).toBe(60);
  });

  it('drags the medical category down hardest of all categories for open SOS alerts (safety-critical weighting)', async () => {
    mockAllClear();
    vi.mocked(prisma.sOSAlert.count).mockResolvedValue(3); // 3 * 15 = 45 point penalty
    const health = await getStadiumHealthScore();
    expect(health.categories.medical.score).toBe(55);
    expect(health.categories.medical.status).toBe('orange'); // 50-74 band
  });

  it('never lets a category score go below 0 or above 100', async () => {
    mockAllClear();
    vi.mocked(prisma.incident.count).mockResolvedValue(50); // would be very negative unclamped
    const health = await getStadiumHealthScore();
    expect(health.categories.security.score).toBe(0);
    expect(health.categories.security.status).toBe('red');
  });

  it('does not penalize crowd/parking scores until they cross their respective thresholds', async () => {
    mockAllClear();
    vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([{ capacityPct: 65 }] as never); // under 70
    const health = await getStadiumHealthScore();
    expect(health.categories.crowd.score).toBe(100);
  });

  it('surfaces the AI insights count from the existing insights engine, not a separate calculation', async () => {
    mockAllClear();
    vi.mocked(generateInsights).mockResolvedValue([{ id: '1' }, { id: '2' }] as never);
    const health = await getStadiumHealthScore();
    expect(health.aiRecommendationCount).toBe(2);
  });

  it('defaults the energy category to a neutral score when no reading exists yet, rather than penalizing', async () => {
    mockAllClear();
    vi.mocked(prisma.energyReading.findFirst).mockResolvedValue(null);
    const health = await getStadiumHealthScore();
    expect(health.categories.energy.score).toBe(80);
  });
});
