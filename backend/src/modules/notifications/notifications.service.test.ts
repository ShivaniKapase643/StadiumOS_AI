import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    notification: { findUnique: vi.fn(), update: vi.fn(), createMany: vi.fn() },
    user: { findMany: vi.fn() },
    notificationLog: { create: vi.fn() },
  },
}));
vi.mock('../../sockets', () => ({ emitToAll: vi.fn() }));

import { prisma } from '../../config/db';
import { markNotificationRead, broadcastNotification } from './notifications.service';

describe('notifications.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects marking another user's notification as read (ownership boundary)", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({ id: 'n1', userId: 'someone-else' } as never);
    await expect(markNotificationRead('u1', 'n1')).rejects.toMatchObject({ status: 404 });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks the caller\'s own notification as read', async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({ id: 'n1', userId: 'u1' } as never);
    vi.mocked(prisma.notification.update).mockResolvedValue({} as never);
    await markNotificationRead('u1', 'n1');
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } });
  });

  it('logs the recipient count and audience roles in the notification log', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] as never);
    vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(prisma.notificationLog.create).mockResolvedValue({} as never);

    const result = await broadcastNotification({
      title: 'Gate change',
      body: 'Gate C is now open',
      type: 'GENERAL',
      channel: 'IN_APP',
      audienceRoles: ['VOLUNTEER', 'SECURITY_OFFICER'],
    });

    expect(result.recipientCount).toBe(3);
    expect(prisma.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipient: '3 users (VOLUNTEER, SECURITY_OFFICER)' }) })
    );
  });

  it('labels the log "all roles" when no audience filter is applied', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.notificationLog.create).mockResolvedValue({} as never);

    await broadcastNotification({ title: 'x', body: 'y', type: 'GENERAL', channel: 'IN_APP', audienceRoles: [] });
    expect(prisma.notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipient: '0 users (all roles)' }) }));
  });
});
