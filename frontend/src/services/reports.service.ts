import { api } from './api';

export type ReportType = 'attendance' | 'revenue' | 'crowd' | 'security' | 'vendor' | 'parking' | 'maintenance';

export async function getReport(type: ReportType) {
  const { data } = await api.get<{ data: Array<Record<string, unknown>> }>(`/reports/${type}`);
  return data.data;
}

export interface FullEventReport {
  generatedAt: string;
  health: { overall: number; overallStatus: string };
  sections: {
    attendance: Array<Record<string, unknown>>;
    revenue: Array<Record<string, unknown>>;
    crowd: Array<Record<string, unknown>>;
    security: Array<Record<string, unknown>>;
    vendor: Array<Record<string, unknown>>;
    parking: Array<Record<string, unknown>>;
    maintenance: Array<Record<string, unknown>>;
  };
  aiInsights: Array<{ category: string; severity: string; title: string; recommendation: string }>;
}

export async function getFullEventReport() {
  const { data } = await api.get<{ data: FullEventReport }>('/reports/full-event-report');
  return data.data;
}
