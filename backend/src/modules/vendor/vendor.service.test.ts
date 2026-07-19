import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    vendor: { findUnique: vi.fn(), findMany: vi.fn() },
    inventoryItem: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    foodOrder: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getMyVendor, updateInventoryItem, updateOrderStatus, getMyAnalytics } from './vendor.service';

describe('vendor.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 when the requesting user has no vendor profile at all', async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null);
    await expect(getMyVendor('u1')).rejects.toMatchObject({ status: 404 });
  });

  it("rejects updating another vendor's inventory item (ownership boundary)", async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({ id: 'vendor-A' } as never);
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({ id: 'item1', vendorId: 'vendor-B' } as never); // belongs to a different vendor

    await expect(updateInventoryItem('u1', 'item1', { stock: 5 })).rejects.toMatchObject({ status: 404 });
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('allows updating an inventory item that belongs to the requesting vendor', async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({ id: 'vendor-A' } as never);
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({ id: 'item1', vendorId: 'vendor-A' } as never);
    vi.mocked(prisma.inventoryItem.update).mockResolvedValue({} as never);

    await updateInventoryItem('u1', 'item1', { stock: 5 });
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({ where: { id: 'item1' }, data: { stock: 5 } });
  });

  it("rejects updating another vendor's order (ownership boundary)", async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({ id: 'vendor-A' } as never);
    vi.mocked(prisma.foodOrder.findUnique).mockResolvedValue({ id: 'order1', vendorId: 'vendor-B' } as never);

    await expect(updateOrderStatus('u1', 'order1', 'READY')).rejects.toMatchObject({ status: 404 });
  });

  it('computes total revenue and a per-day breakdown from real orders', async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({ id: 'vendor-A' } as never);
    vi.mocked(prisma.foodOrder.findMany).mockResolvedValue([
      { totalAmount: 25, createdAt: new Date('2026-01-01T10:00:00Z') },
      { totalAmount: 15, createdAt: new Date('2026-01-01T18:00:00Z') },
      { totalAmount: 40, createdAt: new Date('2026-01-02T10:00:00Z') },
    ] as never);

    const analytics = await getMyAnalytics('u1');
    expect(analytics.totalRevenue).toBe(80);
    expect(analytics.totalOrders).toBe(3);
    expect(analytics.revenueByDay).toEqual(
      expect.arrayContaining([
        { date: '2026-01-01', revenue: 40 },
        { date: '2026-01-02', revenue: 40 },
      ])
    );
  });
});
