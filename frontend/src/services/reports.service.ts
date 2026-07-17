import { api } from './api';

export type ReportType = 'attendance' | 'revenue' | 'crowd' | 'security' | 'vendor' | 'parking' | 'maintenance';

export async function getReport(type: ReportType) {
  const { data } = await api.get<{ data: Array<Record<string, unknown>> }>(`/reports/${type}`);
  return data.data;
}
