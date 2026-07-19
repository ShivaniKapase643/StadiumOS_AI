export interface Point {
  x: number;
  y: number;
}

/** Straight-line distance between two zone coordinates, in canvas units. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// The schematic Digital Twin canvas (see seed.ts's mapWidth/mapHeight) isn't
// drawn to real-world scale, but a large stadium footprint spans a few
// hundred meters — this factor converts canvas units to an approximate
// real-world meter distance. Good enough for "which zone is closer" ranking
// and rough ETA estimates; not surveyed precision, and every place that
// surfaces a number derived from it is labeled "estimated".
const METERS_PER_UNIT = 0.3;
const WALKING_SPEED_M_PER_MIN = 80; // ~4.8 km/h — brisk but crowd-slowed pace

export function distanceMeters(a: Point, b: Point): number {
  return Math.round(distance(a, b) * METERS_PER_UNIT);
}

/** congestionMultiplier > 1 slows the estimate down (e.g. 1.5 for a HIGH-density path). */
export function walkingTimeMinutes(meters: number, congestionMultiplier = 1): number {
  return Math.max(1, Math.round((meters / WALKING_SPEED_M_PER_MIN) * congestionMultiplier));
}

/** Nearest candidate to `from` by straight-line distance, or undefined if candidates is empty. */
export function findNearest<T extends Point>(from: Point, candidates: T[]): T | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.reduce((nearest, c) => (distance(from, c) < distance(from, nearest) ? c : nearest));
}
