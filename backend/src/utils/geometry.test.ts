import { describe, it, expect } from 'vitest';
import { distance, distanceMeters, walkingTimeMinutes, findNearest } from './geometry';

describe('geometry', () => {
  it('computes straight-line distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5); // 3-4-5 triangle
  });

  it('converts canvas distance to a rounded meter estimate', () => {
    expect(distanceMeters({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(30); // 100 * 0.3
  });

  it('estimates walking time and never rounds down to zero minutes', () => {
    expect(walkingTimeMinutes(80)).toBe(1); // exactly 1 min at base pace
    expect(walkingTimeMinutes(1)).toBe(1); // rounds up from near-zero, not down to 0
    expect(walkingTimeMinutes(800)).toBe(10);
  });

  it('applies a congestion multiplier to slow the estimate down', () => {
    expect(walkingTimeMinutes(800, 1.5)).toBe(15);
  });

  it('finds the nearest of several candidates', () => {
    const from = { x: 0, y: 0 };
    const candidates = [
      { id: 'far', x: 100, y: 100 },
      { id: 'near', x: 5, y: 5 },
      { id: 'mid', x: 20, y: 20 },
    ];
    expect(findNearest(from, candidates)?.id).toBe('near');
  });

  it('returns undefined when there are no candidates', () => {
    expect(findNearest({ x: 0, y: 0 }, [])).toBeUndefined();
  });
});
