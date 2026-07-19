import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useTheme');

import { useTheme } from '@/hooks/useTheme';
import { useChartSeriesColors, useChartInk, densityLevelColor, CHART_SERIES_LIGHT, CHART_SERIES_DARK } from './chartColors';

describe('useChartSeriesColors', () => {
  it('returns the light palette in light mode', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light' } as never);
    const { result } = renderHook(() => useChartSeriesColors());
    expect(result.current).toBe(CHART_SERIES_LIGHT);
  });

  it('returns the dark palette in dark mode', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark' } as never);
    const { result } = renderHook(() => useChartSeriesColors());
    expect(result.current).toBe(CHART_SERIES_DARK);
  });
});

describe('useChartInk', () => {
  it('returns ink tokens matching the current theme', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark' } as never);
    const { result } = renderHook(() => useChartInk());
    expect(result.current.primary).toBe('#ffffff');
  });
});

describe('densityLevelColor', () => {
  it('maps CRITICAL to the critical color', () => {
    expect(densityLevelColor('CRITICAL', 'light')).toBe('#d03b3b');
  });

  it('maps HIGH to the serious color', () => {
    expect(densityLevelColor('HIGH', 'light')).toBe('#ec835a');
  });

  it('maps MODERATE to the warning color', () => {
    expect(densityLevelColor('MODERATE', 'light')).toBe('#fab219');
  });

  it('falls back to the "good" color for LOW and any unrecognized level', () => {
    expect(densityLevelColor('LOW', 'light')).toBe('#0ca30c');
    expect(densityLevelColor('SOMETHING_UNKNOWN', 'light')).toBe('#0ca30c');
  });

  it('resolves the dark-theme variant when asked', () => {
    expect(densityLevelColor('CRITICAL', 'dark')).toBe('#d03b3b'); // critical is identical in both themes
  });
});
