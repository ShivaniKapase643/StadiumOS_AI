import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    stadium: { findUnique: vi.fn(), findFirst: vi.fn() },
    stadiumZone: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getStadiumOverview, updateZoneStatus, deleteZone } from './twin.service';

describe('twin.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getStadiumOverview', () => {
    it('looks up a specific stadium by id when one is given', async () => {
      vi.mocked(prisma.stadium.findUnique).mockResolvedValue({ id: 's1' } as never);
      await getStadiumOverview('s1');
      expect(prisma.stadium.findUnique).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(prisma.stadium.findFirst).not.toHaveBeenCalled();
    });

    it('falls back to the first configured stadium when no id is given', async () => {
      vi.mocked(prisma.stadium.findFirst).mockResolvedValue({ id: 's1' } as never);
      await getStadiumOverview();
      expect(prisma.stadium.findFirst).toHaveBeenCalled();
    });

    it('throws 404 when no stadium is configured at all', async () => {
      vi.mocked(prisma.stadium.findFirst).mockResolvedValue(null);
      await expect(getStadiumOverview()).rejects.toMatchObject({ status: 404 });
    });
  });

  it('updateZoneStatus throws 404 for a non-existent zone', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(null);
    await expect(updateZoneStatus('nope', 'CLOSED')).rejects.toMatchObject({ status: 404 });
  });

  it('deleteZone throws 404 for a non-existent zone and never calls delete', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(null);
    await expect(deleteZone('nope')).rejects.toMatchObject({ status: 404 });
    expect(prisma.stadiumZone.delete).not.toHaveBeenCalled();
  });
});
