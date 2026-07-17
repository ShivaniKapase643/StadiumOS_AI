import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';

async function requireVendorForUser(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { ownerId: userId } });
  if (!vendor) throw ApiError.notFound('No vendor profile found for this user');
  return vendor;
}

export async function getMyVendor(userId: string) {
  return requireVendorForUser(userId);
}

export async function getMyInventory(userId: string) {
  const vendor = await requireVendorForUser(userId);
  return prisma.inventoryItem.findMany({ where: { vendorId: vendor.id } });
}

export async function addInventoryItem(userId: string, input: { name: string; sku: string; stock: number; price: number }) {
  const vendor = await requireVendorForUser(userId);
  return prisma.inventoryItem.create({ data: { vendorId: vendor.id, ...input } });
}

export async function updateInventoryItem(userId: string, itemId: string, input: { stock?: number; price?: number }) {
  const vendor = await requireVendorForUser(userId);
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.vendorId !== vendor.id) throw ApiError.notFound('Inventory item not found');
  return prisma.inventoryItem.update({ where: { id: itemId }, data: input });
}

export async function getMyOrders(userId: string) {
  const vendor = await requireVendorForUser(userId);
  return prisma.foodOrder.findMany({ where: { vendorId: vendor.id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
}

export async function updateOrderStatus(userId: string, orderId: string, status: 'PLACED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED') {
  const vendor = await requireVendorForUser(userId);
  const order = await prisma.foodOrder.findUnique({ where: { id: orderId } });
  if (!order || order.vendorId !== vendor.id) throw ApiError.notFound('Order not found');
  return prisma.foodOrder.update({ where: { id: orderId }, data: { status } });
}

export async function getMyAnalytics(userId: string) {
  const vendor = await requireVendorForUser(userId);
  const orders = await prisma.foodOrder.findMany({ where: { vendorId: vendor.id } });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const byDay = new Map<string, number>();
  for (const o of orders) {
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(o.totalAmount));
  }

  return {
    totalRevenue,
    totalOrders: orders.length,
    revenueByDay: Array.from(byDay.entries()).map(([date, revenue]) => ({ date, revenue })),
  };
}

export async function listAllVendorsSummary() {
  const vendors = await prisma.vendor.findMany({ include: { inventory: true, orders: true, owner: { select: { name: true } } } });
  return vendors.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    ownerName: v.owner.name,
    status: v.status,
    inventoryCount: v.inventory.length,
    totalRevenue: v.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
  }));
}
