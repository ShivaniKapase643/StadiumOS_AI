import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    workOrder: { findUnique: vi.fn(), update: vi.fn() },
    asset: { findMany: vi.fn() },
    maintenancePrediction: { create: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { updateWorkOrderStatus, recomputePredictions } from './maintenance.service';

describe('maintenance.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('updateWorkOrderStatus', () => {
    it('throws 404 for a non-existent work order', async () => {
      vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(null);
      await expect(updateWorkOrderStatus('nope', 'IN_PROGRESS')).rejects.toMatchObject({ status: 404 });
    });

    it('stamps completedAt only when the status is COMPLETED', async () => {
      vi.mocked(prisma.workOrder.findUnique).mockResolvedValue({ id: 'w1' } as never);
      vi.mocked(prisma.workOrder.update).mockResolvedValue({} as never);

      await updateWorkOrderStatus('w1', 'COMPLETED');
      expect(prisma.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date) }) }));

      await updateWorkOrderStatus('w1', 'IN_PROGRESS');
      expect(prisma.workOrder.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ completedAt: null }) }));
    });
  });

  describe('recomputePredictions', () => {
    it('recommends immediate inspection for a low-health, long-uninspected asset', async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([{ id: 'a1', healthScore: 20, inspectionReports: [] }] as never);
      vi.mocked(prisma.maintenancePrediction.create).mockImplementation(({ data }) => Promise.resolve(data as never));

      const [prediction] = await recomputePredictions();
      expect(prediction.riskScore).toBeGreaterThanOrEqual(70);
      expect(prediction.recommendation).toContain('immediate inspection');
    });

    it('recommends no action for a healthy, recently-inspected asset', async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([
        { id: 'a1', healthScore: 98, inspectionReports: [{ createdAt: new Date() }] },
      ] as never);
      vi.mocked(prisma.maintenancePrediction.create).mockImplementation(({ data }) => Promise.resolve(data as never));

      const [prediction] = await recomputePredictions();
      expect(prediction.riskScore).toBeLessThan(40);
      expect(prediction.recommendation).toContain('No action needed');
    });

    it('never lets the risk score exceed 100 or the remaining useful life drop below 5 days', async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([{ id: 'a1', healthScore: 0, inspectionReports: [] }] as never);
      vi.mocked(prisma.maintenancePrediction.create).mockImplementation(({ data }) => Promise.resolve(data as never));

      const [prediction] = await recomputePredictions();
      expect(prediction.riskScore).toBeLessThanOrEqual(100);
      expect(prediction.remainingUsefulLifeDays).toBeGreaterThanOrEqual(5);
    });

    it('creates one prediction per asset', async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([
        { id: 'a1', healthScore: 80, inspectionReports: [] },
        { id: 'a2', healthScore: 60, inspectionReports: [] },
      ] as never);
      vi.mocked(prisma.maintenancePrediction.create).mockImplementation(({ data }) => Promise.resolve(data as never));

      const predictions = await recomputePredictions();
      expect(predictions).toHaveLength(2);
    });
  });
});
