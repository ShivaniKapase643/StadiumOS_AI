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

export async function updateZoneStatus(zoneId: string, status: string) {
  const { data } = await api.patch<{ data: StadiumZone }>(`/twin/zones/${zoneId}/status`, { status });
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

export async function getReplayTimeRange(stadiumId: string) {
  const { data } = await api.get<{ data: { earliest: string | null; latest: string | null } }>(
    `/twin/stadiums/${stadiumId}/replay-range`
  );
  return data.data;
}

export interface ReplayZoneSnapshot {
  zoneId: string;
  zoneName: string;
  x: number;
  y: number;
  type: ZoneType;
  capacityPct: number | null;
  densityLevel: string | null;
}

export interface ReplaySnapshot {
  at: string;
  zones: ReplayZoneSnapshot[];
  recentEvents: Array<{ kind: 'sos' | 'incident'; label: string; zoneName?: string; at: string }>;
}

export async function getReplaySnapshot(stadiumId: string, at: Date) {
  const { data } = await api.get<{ data: ReplaySnapshot }>(`/twin/stadiums/${stadiumId}/replay`, {
    params: { at: at.toISOString() },
  });
  return data.data;
}
