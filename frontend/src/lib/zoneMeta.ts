import type { ZoneType } from '@/types';
import { CHART_SERIES_LIGHT } from './chartColors';

export const ZONE_TYPE_LABEL: Record<ZoneType, string> = {
  GATE: 'Entry/Exit Gate',
  PARKING: 'Parking',
  MEDICAL: 'Medical Room',
  FIRE_STATION: 'Fire Station',
  WASHROOM: 'Washroom',
  FOOD_COURT: 'Food Court',
  VENDOR_STALL: 'Vendor Stall',
  EV_CHARGING: 'EV Charging',
  EMERGENCY_ROUTE: 'Emergency Route',
  SEATING_BLOCK: 'Seating Block',
  CCTV: 'CCTV Hub',
};

export const ZONE_TYPE_COLOR: Record<ZoneType, string> = {
  SEATING_BLOCK: CHART_SERIES_LIGHT[0],
  GATE: CHART_SERIES_LIGHT[7],
  MEDICAL: CHART_SERIES_LIGHT[5],
  FIRE_STATION: CHART_SERIES_LIGHT[5],
  WASHROOM: CHART_SERIES_LIGHT[2],
  FOOD_COURT: CHART_SERIES_LIGHT[3],
  VENDOR_STALL: CHART_SERIES_LIGHT[6],
  EV_CHARGING: CHART_SERIES_LIGHT[1],
  EMERGENCY_ROUTE: CHART_SERIES_LIGHT[5],
  PARKING: CHART_SERIES_LIGHT[4],
  CCTV: CHART_SERIES_LIGHT[4],
};
