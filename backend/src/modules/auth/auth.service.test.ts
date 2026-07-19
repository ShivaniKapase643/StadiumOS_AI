import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Pure unit tests for auth edge cases that are awkward to set up against a
// real database (an inactive account, a naturally-expired-but-never-revoked
// token) — complements auth.integration.test.ts, which covers the
// happy-path + RBAC + reuse-detection through the real HTTP+DB stack.
vi.mock('../../config/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { login, refresh } from './auth.service';
import { signRefreshToken } from '../../utils/jwt';

describe('auth.service edge cases (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects login for a deactivated account without ever comparing the password', async () => {
    const compareSpy = vi.spyOn(bcrypt, 'compare');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'disabled@example.com',
      passwordHash: 'irrelevant',
      isActive: false,
      role: 'FAN',
    } as never);

    await expect(login('disabled@example.com', 'CorrectPassword123!')).rejects.toMatchObject({ status: 401 });
    // Disabled accounts should be rejected before any password work happens
    // — comparing anyway would let a timing/behavior difference leak which
    // deactivated emails are real accounts.
    expect(compareSpy).not.toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('rejects login for a non-existent email with the same generic error as a wrong password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(login('nobody@example.com', 'whatever')).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' });
  });

  it('rejects a naturally expired refresh token that was never revoked', async () => {
    // Must be a genuinely valid, signed JWT so refresh() gets past
    // verifyRefreshToken() and actually reaches the DB expiry check below —
    // a fabricated string would fail signature verification first and this
    // test would pass for the wrong reason.
    const token = signRefreshToken('user-1');
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revoked: false,
      expiresAt: new Date(Date.now() - 1000), // expired one second ago
    } as never);

    await expect(refresh(token)).rejects.toMatchObject({ status: 401, message: 'Refresh token has been revoked or expired' });
    // Must not fall through to issuing a fresh token pair.
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('detects reuse of an already-revoked refresh token and revokes every session for that user', async () => {
    const token = signRefreshToken('user-1');
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revoked: true, // already used once before — this call is a replay
      expiresAt: new Date(Date.now() + 100000),
    } as never);

    await expect(refresh(token)).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', revoked: false }, data: { revoked: true } });
  });
});
