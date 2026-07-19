import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    lostFoundItem: { findUnique: vi.fn(), update: vi.fn() },
    foodOrder: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    seat: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { updateLostFoundStatus, createFoodOrder, updateFoodOrderStatus, findSeats } from './fan-experience.service';

describe('fan-experience.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 updating a non-existent lost & found item', async () => {
    vi.mocked(prisma.lostFoundItem.findUnique).mockResolvedValue(null);
    await expect(updateLostFoundStatus('nope', 'CLAIMED')).rejects.toMatchObject({ status: 404 });
  });

  it('computes the food order total from item price * quantity, not a client-supplied total', async () => {
    vi.mocked(prisma.foodOrder.create).mockImplementation(({ data }) => Promise.resolve(data as never));

    const order = await createFoodOrder('u1', {
      vendorId: 'v1',
      items: [
        { inventoryItemId: 'i1', name: 'Pizza', price: 10, quantity: 2 },
        { inventoryItemId: 'i2', name: 'Soda', price: 3, quantity: 3 },
      ],
    });

    expect(order.totalAmount).toBe(29); // (10*2) + (3*3)
  });

  it('throws 404 updating a non-existent food order', async () => {
    vi.mocked(prisma.foodOrder.findUnique).mockResolvedValue(null);
    await expect(updateFoodOrderStatus('nope', 'READY')).rejects.toMatchObject({ status: 404 });
  });

  it('filters seats case-insensitively by section and only applies filters that were provided', async () => {
    vi.mocked(prisma.seat.findMany).mockResolvedValue([] as never);

    await findSeats({ section: 'vip' });
    expect(prisma.seat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { section: { equals: 'vip', mode: 'insensitive' } } })
    );
  });

  it('applies no filters at all when no criteria are given', async () => {
    vi.mocked(prisma.seat.findMany).mockResolvedValue([] as never);
    await findSeats({});
    expect(prisma.seat.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
