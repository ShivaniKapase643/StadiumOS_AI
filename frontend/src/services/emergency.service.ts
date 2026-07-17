import { api } from './api';

export interface SosAlertDto {
  id: string;
  type: 'MEDICAL' | 'FIRE' | 'SECURITY' | 'OTHER';
  status: 'OPEN' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
  resolvedAt?: string | null;
  user: { name: string };
  zone?: { name: string } | null;
  ambulanceDispatch?: { dispatchedAt: string; driverName?: string | null } | null;
}

export interface EvacuationPlanDto {
  id: string;
  name: string;
  status: string;
}

export async function listSosAlerts() {
  const { data } = await api.get<{ data: SosAlertDto[] }>('/emergency/sos');
  return data.data;
}

export async function raiseSosAlert(input: { type: string; zoneId?: string }) {
  const { data } = await api.post('/emergency/sos', input);
  return data.data;
}

export async function dispatchAmbulance(id: string, driverName?: string) {
  const { data } = await api.post(`/emergency/sos/${id}/dispatch`, { driverName });
  return data.data;
}

export async function resolveSosAlert(id: string) {
  const { data } = await api.post(`/emergency/sos/${id}/resolve`, {});
  return data.data;
}

export async function listEvacuationPlans() {
  const { data } = await api.get<{ data: EvacuationPlanDto[] }>('/emergency/evacuation-plans');
  return data.data;
}
