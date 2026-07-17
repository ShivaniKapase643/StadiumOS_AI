import { api } from './api';
import type { DashboardKpis, Fixture } from '@/types';

export async function getKpis() {
  const { data } = await api.get<{ data: DashboardKpis }>('/dashboard/kpis');
  return data.data;
}

export async function getAttendanceTrend() {
  const { data } = await api.get<{ data: Array<{ time: string; attendance: number }> }>('/dashboard/attendance-trend');
  return data.data;
}

export async function getRevenueTrend() {
  const { data } = await api.get<{ data: Array<{ date: string; revenue: number }> }>('/dashboard/revenue-trend');
  return data.data;
}

export async function getCrowdByZone() {
  const { data } = await api.get<{ data: Array<{ zoneName: string; capacityPct: number; densityLevel: string }> }>(
    '/dashboard/crowd-by-zone'
  );
  return data.data;
}

export async function getTicketTierSplit() {
  const { data } = await api.get<{ data: Array<{ tier: string; count: number }> }>('/dashboard/ticket-tier-split');
  return data.data;
}

export async function getUpcomingMatches() {
  const { data } = await api.get<{ data: Fixture[] }>('/dashboard/upcoming-matches');
  return data.data;
}

export async function getRecentActivity() {
  const { data } = await api.get<{
    data: Array<{ id: string; action: string; entityType: string; createdAt: string; user?: { name: string; role: string } }>;
  }>('/dashboard/recent-activity');
  return data.data;
}
