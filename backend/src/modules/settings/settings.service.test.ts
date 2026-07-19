import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    apiKey: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { updateUserRole, toggleUserActive, createApiKey, revokeApiKey } from './settings.service';

describe('settings.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 changing the role of a non-existent user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(updateUserRole('nope', 'STADIUM_ADMIN')).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 toggling a non-existent user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(toggleUserActive('nope', false)).rejects.toMatchObject({ status: 404 });
  });

  it('returns the raw API key only at creation time, stored as a bcrypt hash', async () => {
    vi.mocked(prisma.apiKey.create).mockImplementation(({ data }) => Promise.resolve({ id: 'k1', ...data } as never));

    const key = await createApiKey('org1', { name: 'Integration', scopes: ['read'] });
    expect(key.rawKey).toMatch(/^sk_[0-9a-f]{48}$/);
    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ keyHash: expect.not.stringContaining(key.rawKey) }) })
    );
  });

  it("rejects revoking another organization's API key (tenant isolation)", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'k1', organizationId: 'org-B' } as never);
    await expect(revokeApiKey('org-A', 'k1')).rejects.toMatchObject({ status: 404 });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('allows revoking an API key belonging to the requesting organization', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({ id: 'k1', organizationId: 'org-A' } as never);
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

    await revokeApiKey('org-A', 'k1');
    expect(prisma.apiKey.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'k1' } }));
  });
});
