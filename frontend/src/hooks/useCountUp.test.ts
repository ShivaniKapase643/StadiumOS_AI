import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCountUp } from './useCountUp';

const { useReducedMotionMock } = vi.hoisted(() => ({ useReducedMotionMock: vi.fn(() => false) }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: useReducedMotionMock };
});

describe('useCountUp', () => {
  it('skips animation and shows the value immediately when reduced motion is preferred', () => {
    useReducedMotionMock.mockReturnValueOnce(true);
    const { result } = renderHook(() => useCountUp('42%'));
    expect(result.current).toBe('42%');
  });

  it('falls back to the raw value when no numeric portion is found', () => {
    const { result } = renderHook(() => useCountUp('Live'));
    expect(result.current).toBe('Live');
  });

  it('animates up to the target and preserves prefix/comma formatting at the end', async () => {
    const { result, rerender } = renderHook(({ value }) => useCountUp(value, 0.05), {
      initialProps: { value: '$0' },
    });

    rerender({ value: '$1,234' });

    await waitFor(() => expect(result.current).toBe('$1,234'), { timeout: 2000 });
  });

  it('preserves decimal precision from the source value', async () => {
    const { result, rerender } = renderHook(({ value }) => useCountUp(value, 0.05), {
      initialProps: { value: '0.0%' },
    });

    rerender({ value: '59.9%' });

    await waitFor(() => expect(result.current).toBe('59.9%'), { timeout: 2000 });
  });
});
