import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    parkingSlot: { findUnique: vi.fn(), update: vi.fn() },
    parkingReservation: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    parkingLot: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../config/db';
import { createReservation, cancelReservation, getParkingAnalytics } from './parking.service';

describe('parking.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createReservation', () => {
    it('throws 404 for a non-existent slot', async () => {
      vi.mocked(prisma.parkingSlot.findUnique).mockResolvedValue(null);
      await expect(createReservation('u1', { slotId: 'nope', vehicleNumber: 'AB123', startTime: new Date() })).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws 409 when the slot is not AVAILABLE', async () => {
      vi.mocked(prisma.parkingSlot.findUnique).mockResolvedValue({ id: 's1', status: 'OCCUPIED' } as never);
      await expect(createReservation('u1', { slotId: 's1', vehicleNumber: 'AB123', startTime: new Date() })).rejects.toMatchObject({
        status: 409,
      });
    });

    it('creates the reservation and marks the slot RESERVED in one transaction', async () => {
      vi.mocked(prisma.parkingSlot.findUnique).mockResolvedValue({ id: 's1', status: 'AVAILABLE' } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 'r1' }, {}] as never);

      const result = await createReservation('u1', { slotId: 's1', vehicleNumber: 'AB123', startTime: new Date() });
      expect(result).toEqual({ id: 'r1' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('cancelReservation', () => {
    it('throws 404 for a reservation owned by a different user', async () => {
      vi.mocked(prisma.parkingReservation.findUnique).mockResolvedValue({ id: 'r1', userId: 'someone-else', status: 'ACTIVE' } as never);
      await expect(cancelReservation('u1', 'r1')).rejects.toMatchObject({ status: 404 });
    });

    it('throws 400 when the reservation is already cancelled', async () => {
      vi.mocked(prisma.parkingReservation.findUnique).mockResolvedValue({ id: 'r1', userId: 'u1', status: 'CANCELLED' } as never);
      await expect(cancelReservation('u1', 'r1')).rejects.toMatchObject({ status: 400 });
    });

    it('cancels the reservation and frees the slot in one transaction', async () => {
      vi.mocked(prisma.parkingReservation.findUnique).mockResolvedValue({ id: 'r1', userId: 'u1', status: 'ACTIVE', slotId: 's1' } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as never);

      await cancelReservation('u1', 'r1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getParkingAnalytics', () => {
    it('computes occupancy percentage including both occupied and reserved slots', async () => {
      vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([
        {
          id: 'l1',
          name: 'North Lot',
          slots: [{ status: 'OCCUPIED', type: 'STANDARD' }, { status: 'RESERVED', type: 'EV' }, { status: 'AVAILABLE', type: 'STANDARD' }, { status: 'AVAILABLE', type: 'STANDARD' }],
        },
      ] as never);

      const [lot] = await getParkingAnalytics();
      expect(lot.total).toBe(4);
      expect(lot.occupied).toBe(1);
      expect(lot.reserved).toBe(1);
      expect(lot.available).toBe(2);
      expect(lot.occupancyPct).toBe(50); // (1 occupied + 1 reserved) / 4
      expect(lot.evSlots).toBe(1);
    });

    it('handles a lot with zero slots without dividing by zero', async () => {
      vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([{ id: 'l1', name: 'Empty Lot', slots: [] }] as never);
      const [lot] = await getParkingAnalytics();
      expect(lot.occupancyPct).toBe(0);
    });
  });
});
