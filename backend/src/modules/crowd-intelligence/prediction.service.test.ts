import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    stadiumZone: { findMany: vi.fn() },
    weatherSnapshot: { findFirst: vi.fn() },
    fixture: { count: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { predictCrowdRisk } from './prediction.service';

function reading(capacityPct: number, densityLevel: string, minutesAgo: number) {
  return { capacityPct, densityLevel, recordedAt: new Date(Date.now() - minutesAgo * 60000) };
}

describe('predictCrowdRisk (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.fixture.count).mockResolvedValue(0);
  });

  it('reports low confidence when a zone has fewer than 3 readings', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { id: 'z1', name: 'Gate A', type: 'GATE', crowdReadings: [reading(50, 'MODERATE', 0), reading(45, 'MODERATE', 1)] },
    ] as never);

    const [prediction] = await predictCrowdRisk('stadium-1');
    expect(prediction.confidencePct).toBe(35);
    expect(prediction.predictedCapacityPct).toBe(prediction.currentCapacityPct);
  });

  it('projects a rising trend forward and flags escalation to a worse density band', async () => {
    // Steadily climbing: 60 -> 70 -> 80 -> 90 over ~4 readings.
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      {
        id: 'z1',
        name: 'East Stand',
        type: 'SEATING_BLOCK',
        crowdReadings: [reading(90, 'CRITICAL', 0), reading(80, 'HIGH', 1), reading(70, 'HIGH', 2), reading(60, 'MODERATE', 3)],
      },
    ] as never);

    const [prediction] = await predictCrowdRisk('stadium-1');
    expect(prediction.predictedCapacityPct).toBeGreaterThan(prediction.currentCapacityPct);
    expect(prediction.reason).toContain('rising crowd trend');
  });

  it('gives a low confidence score to a zone whose deltas mostly disagree with the overall trend direction', async () => {
    // Oldest->newest: 60, 62, 42, 44 — deltas +2, -20, +2. Only 1 of 3
    // deltas agrees in sign with the (negative, dominated by the -20 swing)
    // overall trend, so consistency — and therefore confidence — is low.
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      {
        id: 'z1',
        name: 'Food Court',
        type: 'FOOD_COURT',
        crowdReadings: [reading(44, 'MODERATE', 0), reading(42, 'MODERATE', 1), reading(62, 'HIGH', 2), reading(60, 'HIGH', 3)],
      },
    ] as never);

    const [prediction] = await predictCrowdRisk('stadium-1');
    expect(prediction.confidencePct).toBeLessThan(70);
  });

  it('never lets the predicted capacity exceed 100%', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      {
        id: 'z1',
        name: 'Gate B',
        type: 'GATE',
        crowdReadings: [reading(98, 'CRITICAL', 0), reading(90, 'CRITICAL', 1), reading(80, 'HIGH', 2), reading(70, 'HIGH', 3)],
      },
    ] as never);

    const [prediction] = await predictCrowdRisk('stadium-1');
    expect(prediction.predictedCapacityPct).toBeLessThanOrEqual(100);
  });

  it('adds a live-match reason for gates when a fixture is currently LIVE', async () => {
    vi.mocked(prisma.fixture.count).mockResolvedValue(1);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { id: 'z1', name: 'Gate A', type: 'GATE', crowdReadings: [reading(50, 'MODERATE', 0), reading(48, 'MODERATE', 1), reading(46, 'MODERATE', 2)] },
    ] as never);

    const [prediction] = await predictCrowdRisk('stadium-1');
    expect(prediction.reason).toContain('live');
  });

  it('sorts predictions by predicted severity, most critical first', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { id: 'low', name: 'Low Zone', type: 'GATE', crowdReadings: [reading(10, 'LOW', 0), reading(10, 'LOW', 1), reading(10, 'LOW', 2)] },
      { id: 'crit', name: 'Critical Zone', type: 'GATE', crowdReadings: [reading(95, 'CRITICAL', 0), reading(92, 'CRITICAL', 1), reading(90, 'CRITICAL', 2)] },
    ] as never);

    const predictions = await predictCrowdRisk('stadium-1');
    expect(predictions[0].zoneId).toBe('crit');
  });

  it('skips zones with no crowd readings at all', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([{ id: 'z1', name: 'New Zone', type: 'GATE', crowdReadings: [] }] as never);
    const predictions = await predictCrowdRisk('stadium-1');
    expect(predictions).toHaveLength(0);
  });
});
