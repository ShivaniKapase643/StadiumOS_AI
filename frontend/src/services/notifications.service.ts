import { api } from './api';
import type { Role } from '@/types';

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationLogDto {
  id: string;
  channel: string;
  recipient: string;
  subject?: string | null;
  body: string;
  status: string;
  sentAt: string;
}

export async function getMyNotifications() {
  const { data } = await api.get<{ data: NotificationDto[] }>('/notifications/mine');
  return data.data;
}

export async function markRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await api.post('/notifications/read-all', {});
}

export async function broadcast(input: { title: string; body: string; type: string; channel: string; audienceRoles: Role[] }) {
  const { data } = await api.post('/notifications/broadcast', input);
  return data.data as { recipientCount: number };
}

export async function getLogs() {
  const { data } = await api.get<{ data: NotificationLogDto[] }>('/notifications/logs');
  return data.data;
}
