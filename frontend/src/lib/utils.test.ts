import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatNumber } from './utils';

describe('cn', () => {
  it('merges class names, dropping falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('resolves conflicting tailwind classes to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatCurrency', () => {
  it('formats a number as USD currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});
