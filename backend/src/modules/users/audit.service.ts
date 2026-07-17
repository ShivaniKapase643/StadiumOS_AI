import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';

export async function logAudit(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
}
