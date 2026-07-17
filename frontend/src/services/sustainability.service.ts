import { api } from './api';

export interface SustainabilitySummary {
  energy: { latest: { consumptionKwh: number; solarGenKwh: number } | null; trend: Array<{ date: string; consumptionKwh: number; solarGenKwh: number }> };
  water: { latest: { usageLiters: number } | null; trend: Array<{ date: string; usageLiters: number }> };
  waste: { totalKg: number; recycledKg: number; recyclingRatePct: number; records: Array<{ category: string; weightKg: number; recycled: boolean }> };
  carbon: { latest: { co2eKg: number } | null; trend: Array<{ date: string; co2eKg: number }> };
}

export async function getSummary() {
  const { data } = await api.get<{ data: SustainabilitySummary }>('/sustainability/summary');
  return data.data;
}
