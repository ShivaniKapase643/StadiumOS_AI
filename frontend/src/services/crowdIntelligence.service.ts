import { api } from './api';

export interface CongestionZone {
  zoneId: string;
  zoneName: string;
  zoneType: string;
  currentPct: number;
  trendPerReading: number;
  predictedNextPct: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface QueueStatus {
  zoneId: string;
  zoneName: string;
  queueLength: number;
  estimatedWaitMinutes: number;
  status: 'CLEAR' | 'BUSY' | 'CONGESTED';
}

export interface PeakHour {
  hour: number;
  averageCapacityPct: number;
}

export async function getCongestion() {
  const { data } = await api.get<{ data: CongestionZone[] }>('/crowd-intelligence/congestion');
  return data.data;
}

export async function getQueues() {
  const { data } = await api.get<{ data: QueueStatus[] }>('/crowd-intelligence/queues');
  return data.data;
}

export async function getPeakHours() {
  const { data } = await api.get<{ data: PeakHour[] }>('/crowd-intelligence/peak-hours');
  return data.data;
}
