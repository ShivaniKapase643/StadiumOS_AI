import { Role } from '@prisma/client';
import { signAccessToken } from '../utils/jwt';

/**
 * Forges a valid, signed access token without touching the database —
 * requireAuth only verifies the JWT signature (see middleware/auth.ts), so
 * this is enough to drive requests through the real Express app in route
 * tests that mock the service layer instead of using a live Postgres.
 */
export function tokenFor(role: Role, overrides: { sub?: string; email?: string } = {}): string {
  return signAccessToken({ sub: overrides.sub ?? 'test-user-id', role, email: overrides.email ?? 'test@example.com' });
}
