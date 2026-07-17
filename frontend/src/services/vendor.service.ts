import { api } from './api';

export interface InventoryItemDto {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

export interface VendorOrderDto {
  id: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: { name: string };
}

export async function getMyVendor() {
  const { data } = await api.get('/vendor/me');
  return data.data as { id: string; name: string; category: string };
}

export async function getMyInventory() {
  const { data } = await api.get<{ data: InventoryItemDto[] }>('/vendor/inventory');
  return data.data;
}

export async function addInventoryItem(input: { name: string; sku: string; stock: number; price: number }) {
  const { data } = await api.post('/vendor/inventory', input);
  return data.data;
}

export async function updateInventoryItem(id: string, input: { stock?: number; price?: number }) {
  const { data } = await api.patch(`/vendor/inventory/${id}`, input);
  return data.data;
}

export async function getMyOrders() {
  const { data } = await api.get<{ data: VendorOrderDto[] }>('/vendor/orders');
  return data.data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { data } = await api.patch(`/vendor/orders/${id}/status`, { status });
  return data.data;
}

export async function getMyAnalytics() {
  const { data } = await api.get<{
    data: { totalRevenue: number; totalOrders: number; revenueByDay: Array<{ date: string; revenue: number }> };
  }>('/vendor/analytics');
  return data.data;
}

export async function getAllVendorsSummary() {
  const { data } = await api.get<{
    data: Array<{ id: string; name: string; category: string; ownerName: string; status: string; inventoryCount: number; totalRevenue: number }>;
  }>('/vendor/all');
  return data.data;
}
