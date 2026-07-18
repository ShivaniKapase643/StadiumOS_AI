import { defineConfig } from 'vitest/config';

// Integration tests hit a real Express app + real Postgres via Supertest —
// unlike vitest.config.ts's pure-logic unit tests, these need a genuine
// DATABASE_URL (see vitest.integration.setup.ts) and run noticeably slower,
// so they're kept in a separate config/script (`npm run test:integration`)
// rather than bundled into the default `npm run test`.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.integration.setup.ts'],
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 20000,
    // Integration tests share one Postgres connection pool and mutate real
    // rows (with cleanup) — run them serially to avoid cross-test races.
    fileParallelism: false,
  },
});
