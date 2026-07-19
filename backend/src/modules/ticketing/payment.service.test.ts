import { describe, it, expect } from 'vitest';
import { charge, processRefund } from './payment.service';

describe('payment.service (unit)', () => {
  it('returns a uniquely-prefixed transaction reference on every charge', async () => {
    const [a, b] = await Promise.all([charge(10, 'CARD'), charge(10, 'CARD')]);
    expect(a.transactionRef).toMatch(/^MOCK_[0-9A-F]+$/);
    expect(a.transactionRef).not.toBe(b.transactionRef);
  });

  it('succeeds roughly 92% of the time over many trials', async () => {
    const results = await Promise.all(Array.from({ length: 150 }, () => charge(10, 'CARD')));
    const successRate = results.filter((r) => r.status === 'SUCCESS').length / results.length;
    // Statistical, not exact — wide enough band to avoid flaking while still
    // catching a badly broken rate (e.g. always-fail or always-succeed).
    expect(successRate).toBeGreaterThan(0.8);
    expect(successRate).toBeLessThan(1);
  }, 15000);

  it('every charge resolves to either SUCCESS or FAILED, never anything else', async () => {
    const results = await Promise.all(Array.from({ length: 30 }, () => charge(5, 'UPI')));
    for (const r of results) expect(['SUCCESS', 'FAILED']).toContain(r.status);
  });

  it('processRefund resolves to either PROCESSED or REJECTED', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => processRefund(10)));
    for (const r of results) expect(['PROCESSED', 'REJECTED']).toContain(r.status);
  });
});
