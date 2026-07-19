import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { Role } from '@prisma/client';

export async function getOrganization(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw ApiError.notFound('Organization not found');
  return org;
}

export async function updateOrganization(organizationId: string, input: { name?: string; logoUrl?: string }) {
  return prisma.organization.update({ where: { id: organizationId }, data: input });
}

export async function listUsers(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function updateUserRole(userId: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return prisma.user.update({ where: { id: userId }, data: { role } });
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return prisma.user.update({ where: { id: userId }, data: { isActive } });
}

export async function listApiKeys(organizationId: string) {
  return prisma.apiKey.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
}

export async function createApiKey(organizationId: string, input: { name: string; scopes: string[] }) {
  const rawKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = await bcrypt.hash(rawKey, 10);
  const apiKey = await prisma.apiKey.create({ data: { organizationId, name: input.name, scopes: input.scopes, keyHash } });
  // Raw key is only ever shown once, at creation time.
  return { ...apiKey, rawKey };
}

export async function revokeApiKey(organizationId: string, keyId: string) {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!key || key.organizationId !== organizationId) throw ApiError.notFound('API key not found');
  return prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
}

export async function getAuditLogs(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count(),
  ]);
  return { items, total, page, pageSize };
}
