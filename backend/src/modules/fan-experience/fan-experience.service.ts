import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { LostFoundStatus, OrderStatus, SeatTier } from '@prisma/client';

// Lost & Found -----------------------------------------------------------

export async function listLostFoundItems(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.lostFoundItem.findMany({
      include: { reporter: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lostFoundItem.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function createLostFoundItem(reporterId: string, input: { description: string; category: string; location?: string }) {
  return prisma.lostFoundItem.create({ data: { reporterId, ...input } });
}

export async function updateLostFoundStatus(itemId: string, status: LostFoundStatus) {
  const item = await prisma.lostFoundItem.findUnique({ where: { id: itemId } });
  if (!item) throw ApiError.notFound('Item not found');
  return prisma.lostFoundItem.update({ where: { id: itemId }, data: { status } });
}

// Food ordering ------------------------------------------------------------

export async function listActiveVendors() {
  return prisma.vendor.findMany({
    where: { status: 'ACTIVE' },
    include: { inventory: true },
  });
}

export async function createFoodOrder(
  userId: string,
  input: { vendorId: string; items: Array<{ inventoryItemId: string; name: string; price: number; quantity: number }> }
) {
  const totalAmount = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return prisma.foodOrder.create({
    data: { userId, vendorId: input.vendorId, items: input.items, totalAmount },
  });
}

export async function getMyFoodOrders(userId: string) {
  return prisma.foodOrder.findMany({ where: { userId }, include: { vendor: true }, orderBy: { createdAt: 'desc' } });
}

export async function updateFoodOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.foodOrder.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Order not found');
  return prisma.foodOrder.update({ where: { id: orderId }, data: { status } });
}

// Seat finder ----------------------------------------------------------------

export async function findSeats(criteria: { tier?: SeatTier; section?: string; row?: string; number?: number }) {
  return prisma.seat.findMany({
    where: {
      ...(criteria.tier ? { tier: criteria.tier } : {}),
      ...(criteria.section ? { section: { equals: criteria.section, mode: 'insensitive' } } : {}),
      ...(criteria.row ? { row: { equals: criteria.row, mode: 'insensitive' } } : {}),
      ...(criteria.number ? { number: criteria.number } : {}),
    },
    orderBy: [{ section: 'asc' }, { row: 'asc' }, { number: 'asc' }],
    take: 100,
  });
}
