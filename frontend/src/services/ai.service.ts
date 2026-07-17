import { api } from './api';

export interface Insight {
  id: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  recommendation: string;
  zoneName?: string;
}

export async function getInsights() {
  const { data } = await api.get<{ data: Insight[] }>('/ai/insights');
  return data.data;
}

export async function askChatbot(message: string) {
  const { data } = await api.post<{ data: { reply: string } }>('/ai/chatbot', { message });
  return data.data.reply;
}
