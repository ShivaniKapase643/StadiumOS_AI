import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { prisma } from '../../config/db';
import { logAudit } from './audit.service';

describe('logAudit (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records the actor, action, and target entity', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    await logAudit('user-1', 'CREATE_TOURNAMENT', 'Tournament', 'tourn-1');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', action: 'CREATE_TOURNAMENT', entityType: 'Tournament', entityId: 'tourn-1', metadata: undefined },
    });
  });

  it('accepts an undefined userId for system-initiated actions without throwing', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    await expect(logAudit(undefined, 'SYSTEM_CLEANUP', 'Session')).resolves.not.toThrow();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: undefined }) }));
  });

  it('passes through optional metadata untouched', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
    await logAudit('user-1', 'UPDATE_USER_ROLE', 'User', 'u2', { role: 'STADIUM_ADMIN' });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: { role: 'STADIUM_ADMIN' } }) }));
  });
});
