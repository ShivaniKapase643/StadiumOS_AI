import { describe, it, expect } from 'vitest';
import { Role } from '@prisma/client';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from './jwt';

describe('jwt utils', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user-1', role: Role.FAN, email: 'fan@stadiumos.dev' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe(Role.FAN);
    expect(payload.email).toBe('fan@stadiumos.dev');
  });

  it('round-trips a refresh token', () => {
    const token = signRefreshToken('user-2');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user-2');
  });

  it('rejects a garbage access token', () => {
    expect(() => verifyAccessToken('not-a-real-token')).toThrow();
  });

  it('rejects an access token verified as a refresh token (different secrets)', () => {
    const accessToken = signAccessToken({ sub: 'user-3', role: Role.SUPER_ADMIN, email: 'admin@stadiumos.dev' });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
