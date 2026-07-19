import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    incident: { findUnique: vi.fn(), update: vi.fn() },
    emergencyBroadcast: { create: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));
vi.mock('../../sockets', () => ({ emitToAll: vi.fn() }));

import { prisma } from '../../config/db';
import { emitToAll } from '../../sockets';
import { updateIncidentStatus, createBroadcast } from './security.service';

describe('security.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('updateIncidentStatus', () => {
    it('throws 404 for a non-existent incident', async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue(null);
      await expect(updateIncidentStatus('nope', 'RESOLVED')).rejects.toMatchObject({ status: 404 });
    });

    it('stamps resolvedAt when marking an incident RESOLVED or CLOSED', async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({ id: 'i1' } as never);
      vi.mocked(prisma.incident.update).mockResolvedValue({} as never);

      await updateIncidentStatus('i1', 'RESOLVED');
      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ resolvedAt: expect.any(Date) }) })
      );
    });

    it('leaves resolvedAt null for a non-terminal status', async () => {
      vi.mocked(prisma.incident.findUnique).mockResolvedValue({ id: 'i1' } as never);
      vi.mocked(prisma.incident.update).mockResolvedValue({} as never);

      await updateIncidentStatus('i1', 'INVESTIGATING');
      expect(prisma.incident.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resolvedAt: null }) }));
    });
  });

  describe('createBroadcast', () => {
    it('targets only the specified audience roles and notifies each recipient', async () => {
      vi.mocked(prisma.emergencyBroadcast.create).mockResolvedValue({ id: 'b1', createdAt: new Date() } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'u1' }, { id: 'u2' }] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 2 } as never);

      const result = await createBroadcast('sender1', { message: 'Evacuate now', severity: 'CRITICAL', audienceRoles: ['SECURITY_OFFICER'] });

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: { in: ['SECURITY_OFFICER'] } } }));
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: 'u1', body: 'Evacuate now' })]) })
      );
      expect(result.recipientCount).toBe(2);
    });

    it('targets everyone when no audience roles are specified', async () => {
      vi.mocked(prisma.emergencyBroadcast.create).mockResolvedValue({ id: 'b1', createdAt: new Date() } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 0 } as never);

      await createBroadcast('sender1', { message: 'All clear', severity: 'LOW', audienceRoles: [] });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('emits a real-time alert for the broadcast', async () => {
      vi.mocked(prisma.emergencyBroadcast.create).mockResolvedValue({ id: 'b1', createdAt: new Date() } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 0 } as never);

      await createBroadcast('sender1', { message: 'Test', severity: 'HIGH', audienceRoles: [] });
      expect(emitToAll).toHaveBeenCalledWith('alert:new', expect.objectContaining({ type: 'BROADCAST', message: 'Test' }));
    });
  });
});
