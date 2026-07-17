import { api } from './api';
import type { Stadium, StadiumZone, ZoneType } from '@/types';

export async function getStadiumOverview() {
  const { data } = await api.get<{ data: Stadium }>('/twin/overview');
  return data.data;
}

export async function listZones(stadiumId: string, type?: ZoneType) {
  const { data } = await api.get<{ data: StadiumZone[] }>(`/twin/stadiums/${stadiumId}/zones`, {
    params: type ? { type } : undefined,
  });
  return data.data;
}

export interface LiveSnapshot {
  zones: StadiumZone[];
  parkingLots: Array<{ id: string; name: string; slots: Array<{ id: string; code: string; type: string; status: string }> }>;
  equipment: Array<{ id: string; name: string; zoneId: string; status: string; healthScore: number }>;
  activeAlerts: Array<{ id: string; type: string; zoneId: string; zone: { name: string }; createdAt: string }>;
}

export async function getLiveSnapshot(stadiumId: string) {
  const { data } = await api.get<{ data: LiveSnapshot }>(`/twin/stadiums/${stadiumId}/live`);
  return data.data;
}
