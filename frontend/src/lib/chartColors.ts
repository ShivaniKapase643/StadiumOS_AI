import { useTheme } from '@/hooks/useTheme';

// Validated categorical palette (dataviz skill reference instance) — fixed
// hue order, never cycled or reassigned per-filter.
export const CHART_SERIES_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
export const CHART_SERIES_DARK = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'];

export const STATUS_COLORS = {
  good: { light: '#0ca30c', dark: '#0ca30c' },
  warning: { light: '#fab219', dark: '#fab219' },
  serious: { light: '#ec835a', dark: '#ec835a' },
  critical: { light: '#d03b3b', dark: '#d03b3b' },
};

export const CHART_INK = {
  light: { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9' },
  dark: { primary: '#ffffff', secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a' },
};

export function useChartSeriesColors(): string[] {
  const { theme } = useTheme();
  return theme === 'dark' ? CHART_SERIES_DARK : CHART_SERIES_LIGHT;
}

export function useChartInk() {
  const { theme } = useTheme();
  return CHART_INK[theme];
}

export function densityLevelColor(level: string, theme: 'light' | 'dark'): string {
  switch (level) {
    case 'CRITICAL':
      return STATUS_COLORS.critical[theme];
    case 'HIGH':
      return STATUS_COLORS.serious[theme];
    case 'MODERATE':
      return STATUS_COLORS.warning[theme];
    default:
      return STATUS_COLORS.good[theme];
  }
}
