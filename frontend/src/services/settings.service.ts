import { api } from './api';
import type { Role } from '@/types';

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  rawKey?: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  user?: { name: string; role: string } | null;
}

export async function getOrganization() {
  const { data } = await api.get('/settings/organization');
  return data.data as { id: string; name: string; logoUrl?: string | null };
}

export async function updateOrganization(input: { name?: string; logoUrl?: string }) {
  const { data } = await api.patch('/settings/organization', input);
  return data.data;
}

export async function listUsers(page = 1) {
  const { data } = await api.get<{ data: OrgUser[]; meta: { total: number; page: number; pageSize: number } }>('/settings/users', {
    params: { page },
  });
  return data;
}

export async function updateUserRole(id: string, role: Role) {
  const { data } = await api.patch(`/settings/users/${id}/role`, { role });
  return data.data;
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const { data } = await api.patch(`/settings/users/${id}/active`, { isActive });
  return data.data;
}

export async function listApiKeys() {
  const { data } = await api.get<{ data: ApiKeyDto[] }>('/settings/api-keys');
  return data.data;
}

export async function createApiKey(input: { name: string; scopes: string[] }) {
  const { data } = await api.post<{ data: ApiKeyDto }>('/settings/api-keys', input);
  return data.data;
}

export async function revokeApiKey(id: string) {
  await api.delete(`/settings/api-keys/${id}`);
}

export async function getAuditLogs(page: number) {
  const { data } = await api.get<{ data: AuditLogDto[]; meta: { total: number; page: number; pageSize: number } }>('/settings/audit-logs', {
    params: { page },
  });
  return data;
}
