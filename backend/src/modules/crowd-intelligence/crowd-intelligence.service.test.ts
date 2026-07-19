import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    stadiumZone: { findMany: vi.fn() },
    crowdDensityReading: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getCongestionOverview, getQueueMonitoring, getPeakHourAnalysis } from './crowd-intelligence.service';

describe('crowd-intelligence.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getCongestionOverview', () => {
    it('classifies a zone climbing toward capacity as CRITICAL risk', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
        {
          id: 'z1',
          name: 'East Stand',
          type: 'SEATING_BLOCK',
          crowdReadings: [{ capacityPct: 92 }, { capacityPct: 80 }, { capacityPct: 70 }],
        },
      ] as never);

      const [zone] = await getCongestionOverview();
      expect(zone.riskLevel).toBe('CRITICAL');
    });

    it('reports LOW risk for a quiet zone with no upward trend', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
        { id: 'z1', name: 'Gate A', type: 'GATE', crowdReadings: [{ capacityPct: 10 }, { capacityPct: 10 }] },
      ] as never);

      const [zone] = await getCongestionOverview();
      expect(zone.riskLevel).toBe('LOW');
    });

    it('defaults to a zero trend and current-only prediction when there is only one reading', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
        { id: 'z1', name: 'Food Court', type: 'FOOD_COURT', crowdReadings: [{ capacityPct: 50 }] },
      ] as never);

      const [zone] = await getCongestionOverview();
      expect(zone.trendPerReading).toBe(0);
      expect(zone.predictedNextPct).toBe(50);
    });

    it('handles a zone with no readings yet without throwing', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([{ id: 'z1', name: 'New Zone', type: 'GATE', crowdReadings: [] }] as never);
      const [zone] = await getCongestionOverview();
      expect(zone.currentPct).toBe(0);
      expect(zone.riskLevel).toBe('LOW');
    });
  });

  describe('getQueueMonitoring', () => {
    it('marks a gate CONGESTED when the estimated wait exceeds 15 minutes', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
        { id: 'g1', name: 'Gate A', crowdReadings: [{ count: 800 }] }, // 800/40 = 20 min
      ] as never);

      const [gate] = await getQueueMonitoring();
      expect(gate.estimatedWaitMinutes).toBe(20);
      expect(gate.status).toBe('CONGESTED');
    });

    it('marks a gate CLEAR when the queue is short', async () => {
      vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([{ id: 'g1', name: 'Gate B', crowdReadings: [{ count: 40 }] }] as never);
      const [gate] = await getQueueMonitoring();
      expect(gate.status).toBe('CLEAR');
    });
  });

  describe('getPeakHourAnalysis', () => {
    it('always returns exactly 24 hourly buckets, even with sparse data', async () => {
      vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([
        { capacityPct: 60, recordedAt: new Date('2026-01-01T05:00:00Z') },
      ] as never);

      const hours = await getPeakHourAnalysis();
      expect(hours).toHaveLength(24);
      expect(hours.find((h) => h.hour === 5)?.averageCapacityPct).toBe(60);
      expect(hours.find((h) => h.hour === 6)?.averageCapacityPct).toBe(0);
    });

    it('averages multiple readings within the same hour', async () => {
      vi.mocked(prisma.crowdDensityReading.findMany).mockResolvedValue([
        { capacityPct: 40, recordedAt: new Date('2026-01-01T10:05:00Z') },
        { capacityPct: 60, recordedAt: new Date('2026-01-01T10:45:00Z') },
      ] as never);

      const hours = await getPeakHourAnalysis();
      expect(hours.find((h) => h.hour === 10)?.averageCapacityPct).toBe(50);
    });
  });
});
