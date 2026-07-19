import { api } from './api';

export interface LostFoundItemDto {
  id: string;
  description: string;
  category: string;
  location?: string | null;
  status: 'REPORTED' | 'MATCHED' | 'CLAIMED' | 'CLOSED';
  createdAt: string;
  reporter: { name: string };
}

export interface VendorWithInventory {
  id: string;
  name: string;
  category: string;
  inventory: Array<{ id: string; name: string; sku: string; stock: number; price: number }>;
}

export interface FoodOrderDto {
  id: string;
  vendor: { name: string };
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export async function listLostFound(page = 1) {
  const { data } = await api.get<{ data: LostFoundItemDto[]; meta: { total: number; page: number; pageSize: number } }>(
    '/fan-experience/lost-found',
    { params: { page } }
  );
  return data;
}

export async function reportLostFound(input: { description: string; category: string; location?: string }) {
  const { data } = await api.post('/fan-experience/lost-found', input);
  return data.data;
}

export async function listVendorsForOrdering() {
  const { data } = await api.get<{ data: VendorWithInventory[] }>('/fan-experience/vendors');
  return data.data;
}

export async function placeFoodOrder(input: { vendorId: string; items: Array<{ inventoryItemId: string; name: string; price: number; quantity: number }> }) {
  const { data } = await api.post('/fan-experience/food-orders', input);
  return data.data;
}

export async function getMyFoodOrders() {
  const { data } = await api.get<{ data: FoodOrderDto[] }>('/fan-experience/food-orders/mine');
  return data.data;
}

export interface SeatSearchResult {
  id: string;
  section: string;
  row: string;
  number: number;
  tier: string;
}

export interface SeatSearchCriteria {
  tier?: string;
  section?: string;
  row?: string;
  number?: string;
}

export async function findSeats(criteria: SeatSearchCriteria) {
  const params: Record<string, string> = {};
  if (criteria.tier) params.tier = criteria.tier;
  if (criteria.section) params.section = criteria.section;
  if (criteria.row) params.row = criteria.row;
  if (criteria.number) params.number = criteria.number;
  const { data } = await api.get<{ data: SeatSearchResult[] }>('/fan-experience/seat-finder', { params });
  return data.data;
}
