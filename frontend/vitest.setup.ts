import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts doesn't set `test.globals: true`, so Testing Library's
// automatic per-test cleanup (which relies on a global `afterEach`) never
// registers on its own — without this, DOM from earlier tests in the same
// file accumulates and later queries like getByRole can match duplicates.
afterEach(cleanup);
