import { api } from './api';

export interface AssetDto {
  id: string;
  name: string;
  category: string;
  status: 'ACTIVE' | 'UNDER_MAINTENANCE' | 'RETIRED';
  healthScore: number;
}

export interface WorkOrderDto {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt?: string | null;
  asset: { name: string };
  assignedTo?: { name: string } | null;
}

export interface PredictionDto {
  asset: { id: string; name: string; category: string };
  prediction: { riskScore: number; remainingUsefulLifeDays: number; recommendation: string; predictedAt: string };
}

export async function listAssets() {
  const { data } = await api.get<{ data: AssetDto[] }>('/maintenance/assets');
  return data.data;
}

export async function listWorkOrders() {
  const { data } = await api.get<{ data: WorkOrderDto[] }>('/maintenance/work-orders');
  return data.data;
}

export async function createWorkOrder(input: { assetId: string; title: string; description?: string; priority: string; scheduledAt?: string }) {
  const { data } = await api.post('/maintenance/work-orders', input);
  return data.data;
}

export async function updateWorkOrderStatus(id: string, status: string) {
  const { data } = await api.patch(`/maintenance/work-orders/${id}/status`, { status });
  return data.data;
}

export async function createInspection(input: { assetId: string; findings: string; score: number }) {
  const { data } = await api.post('/maintenance/inspections', input);
  return data.data;
}

export async function listPredictions() {
  const { data } = await api.get<{ data: PredictionDto[] }>('/maintenance/predictions');
  return data.data;
}

export async function recomputePredictions() {
  const { data } = await api.post('/maintenance/predictions/recompute', {});
  return data.data;
}
