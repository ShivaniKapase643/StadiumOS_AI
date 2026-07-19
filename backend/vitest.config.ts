import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'src/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/unit',
      // Without `all: true`, v8 only reports files the unit suite actually
      // imported — most of this codebase's business logic is exercised by
      // the separate integration suite instead, so an honest unit-only
      // number needs everything counted, untested files included as 0%.
      all: true,
      include: ['src/**/*.ts'],
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
