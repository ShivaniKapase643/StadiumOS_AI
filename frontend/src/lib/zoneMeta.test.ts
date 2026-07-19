import { describe, it, expect } from 'vitest';
import { ZONE_TYPE_LABEL, ZONE_TYPE_COLOR } from './zoneMeta';
import { CHART_SERIES_LIGHT } from './chartColors';

const ALL_ZONE_TYPES = [
  'GATE',
  'PARKING',
  'MEDICAL',
  'FIRE_STATION',
  'WASHROOM',
  'FOOD_COURT',
  'VENDOR_STALL',
  'EV_CHARGING',
  'EMERGENCY_ROUTE',
  'SEATING_BLOCK',
  'CCTV',
] as const;

describe('zoneMeta', () => {
  it('has a human-readable label for every zone type', () => {
    for (const type of ALL_ZONE_TYPES) {
      expect(ZONE_TYPE_LABEL[type]).toBeTruthy();
      expect(typeof ZONE_TYPE_LABEL[type]).toBe('string');
    }
  });

  it('has a color for every zone type, drawn from the validated chart palette', () => {
    for (const type of ALL_ZONE_TYPES) {
      expect(ZONE_TYPE_COLOR[type]).toBeTruthy();
      expect(CHART_SERIES_LIGHT).toContain(ZONE_TYPE_COLOR[type]);
    }
  });

  it('gives GATE and PARKING visually distinct colors (commonly shown together on the map)', () => {
    expect(ZONE_TYPE_COLOR.GATE).not.toBe(ZONE_TYPE_COLOR.PARKING);
  });
});
