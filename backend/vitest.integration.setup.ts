// Integration tests exercise the real Express app end-to-end and need a real
// reachable Postgres — unlike vitest.setup.ts (unit tests), we deliberately
// do NOT fill in a dummy DATABASE_URL here. CI provides one via a Postgres
// service container (see .github/workflows/ci.yml); for local runs, export
// DATABASE_URL yourself before running `npm run test:integration` (a Neon
// branch or local Postgres both work — just don't point it at data you care
// about, since these tests create and delete real rows).
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Integration tests need a real Postgres connection — ' +
      'export DATABASE_URL before running `npm run test:integration`.'
  );
}

process.env.JWT_ACCESS_SECRET ??= 'integration_test_access_secret';
process.env.JWT_REFRESH_SECRET ??= 'integration_test_refresh_secret';
process.env.QR_SIGNING_SECRET ??= 'integration_test_qr_secret';
