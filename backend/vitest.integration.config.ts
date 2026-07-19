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
    // A single booking round-trip (bcrypt login + multi-row insert) has been
    // observed taking 10-20s against Neon's pooled endpoint under load —
    // both testTimeout and hookTimeout (which defaults to a separate,
    // shorter 10s) need enough runway for the slower bcrypt-heavy flows.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Integration tests share one Postgres connection pool and mutate real
    // rows (with cleanup) — run them serially to avoid cross-test races.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/test-helpers/**',
        'src/server.ts',
        'prisma/**',
      ],
    },
  },
});
