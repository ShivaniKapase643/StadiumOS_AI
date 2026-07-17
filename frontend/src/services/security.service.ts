import { api } from './api';
import type { Role } from '@/types';

export interface IncidentDto {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  description: string;
  createdAt: string;
  zone?: { name: string } | null;
  reportedBy: { name: string };
  assignedTo?: { name: string } | null;
}

export interface CameraDto {
  id: string;
  label: string;
  status: string;
  zone: { name: string };
}

export interface PatrolLogDto {
  id: string;
  notes?: string | null;
  checkpointAt: string;
  officer: { name: string };
  zone: { name: string };
}

export async function listIncidents() {
  const { data } = await api.get<{ data: IncidentDto[] }>('/security/incidents');
  return data.data;
}

export async function createIncident(input: { type: string; severity: string; description: string; zoneId?: string }) {
  const { data } = await api.post('/security/incidents', input);
  return data.data;
}

export async function updateIncidentStatus(id: string, status: string) {
  const { data } = await api.patch(`/security/incidents/${id}`, { status });
  return data.data;
}

export async function listCameras() {
  const { data } = await api.get<{ data: CameraDto[] }>('/security/cctv');
  return data.data;
}

export async function listPatrolLogs() {
  const { data } = await api.get<{ data: PatrolLogDto[] }>('/security/patrol-logs');
  return data.data;
}

export async function sendBroadcast(input: { message: string; severity: string; audienceRoles: Role[] }) {
  const { data } = await api.post('/security/broadcasts', input);
  return data.data;
}

export interface BroadcastDto {
  id: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  audienceRoles: Role[];
  createdAt: string;
  sender: { name: string; role: Role };
}

export async function listBroadcasts() {
  const { data } = await api.get<{ data: BroadcastDto[] }>('/security/broadcasts');
  return data.data;
}
