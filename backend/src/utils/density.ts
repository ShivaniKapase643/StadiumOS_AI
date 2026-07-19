import { DensityLevel } from '@prisma/client';

/**
 * Shared crowd-density thresholds — used by the live simulator (to classify
 * a freshly generated reading) and the predictive risk engine (to classify
 * a projected future reading), so the two can never silently drift apart.
 */
export function densityLevelFor(pct: number): DensityLevel {
  if (pct >= 90) return DensityLevel.CRITICAL;
  if (pct >= 70) return DensityLevel.HIGH;
  if (pct >= 40) return DensityLevel.MODERATE;
  return DensityLevel.LOW;
}
