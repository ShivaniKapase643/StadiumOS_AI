import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    stadiumZone: { findMany: vi.fn() },
    parkingLot: { findMany: vi.fn() },
    weatherSnapshot: { findFirst: vi.fn() },
    incident: { findMany: vi.fn() },
    sOSAlert: { findMany: vi.fn() },
    equipment: { findMany: vi.fn() },
    ticketType: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { generateInsights } from './insights.service';

function mockAllClear() {
  vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([]);
  vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);
  vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
  vi.mocked(prisma.sOSAlert.findMany).mockResolvedValue([]);
  vi.mocked(prisma.equipment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.ticketType.findMany).mockResolvedValue([]);
}

describe('generateInsights (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllClear();
  });

  it('reports "all systems nominal" when nothing is elevated', async () => {
    const insights = await generateInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('all-clear');
  });

  it('flags a zone at or above 90% capacity as critical', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { id: 'z1', name: 'East Stand', crowdReadings: [{ capacityPct: 95 }] },
    ] as never);
    const insights = await generateInsights();
    expect(insights.find((i) => i.id === 'crowd-critical-z1')?.severity).toBe('critical');
  });

  it('flags a zone between 75-89% as a warning, not critical', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { id: 'z1', name: 'West Stand', crowdReadings: [{ capacityPct: 80 }] },
    ] as never);
    const insights = await generateInsights();
    expect(insights.find((i) => i.id === 'crowd-high-z1')?.severity).toBe('warning');
  });

  it('flags a parking lot at or above 90% occupancy', async () => {
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([
      { id: 'l1', name: 'North Lot', slots: Array.from({ length: 10 }, (_, i) => ({ status: i < 9 ? 'OCCUPIED' : 'AVAILABLE' })) },
    ] as never);
    const insights = await generateInsights();
    expect(insights.find((i) => i.id === 'parking-l1')).toBeTruthy();
  });

  it('flags STORM weather as critical and EXTREME_HEAT as a warning', async () => {
    vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue({ condition: 'STORM', temperatureC: 20 } as never);
    const stormInsights = await generateInsights();
    expect(stormInsights.find((i) => i.id === 'weather-storm')?.severity).toBe('critical');

    vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue({ condition: 'EXTREME_HEAT', temperatureC: 41 } as never);
    const heatInsights = await generateInsights();
    expect(heatInsights.find((i) => i.id === 'weather-heat')?.severity).toBe('warning');
  });

  it('flags elevated security load only once 3+ incidents are open', async () => {
    vi.mocked(prisma.incident.findMany).mockResolvedValue([{ id: '1' }, { id: '2' }] as never);
    expect((await generateInsights()).find((i) => i.id === 'security-load')).toBeUndefined();

    vi.mocked(prisma.incident.findMany).mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }] as never);
    expect((await generateInsights()).find((i) => i.id === 'security-load')).toBeTruthy();
  });

  it('recommends a medical dispatch for a MEDICAL-type open SOS alert', async () => {
    vi.mocked(prisma.sOSAlert.findMany).mockResolvedValue([{ id: 's1', type: 'MEDICAL', zone: { name: 'Gate A' } }] as never);
    const insights = await generateInsights();
    const insight = insights.find((i) => i.id === 'sos-s1');
    expect(insight?.recommendation).toContain('medical team');
  });

  it('flags equipment reporting OFFLINE or CRITICAL health', async () => {
    vi.mocked(prisma.equipment.findMany).mockResolvedValue([
      { id: 'e1', name: 'Turnstile 3', status: 'OFFLINE', zone: { name: 'Gate B' } },
    ] as never);
    const insights = await generateInsights();
    expect(insights.find((i) => i.id === 'equipment-e1')?.category).toBe('Predictive Maintenance');
  });

  it('flags ticket types that are nearly sold out but not fully sold out', async () => {
    vi.mocked(prisma.ticketType.findMany).mockResolvedValue([
      { id: 't1', name: 'VIP', quantity: 100, sold: 98 }, // 2% remaining
      { id: 't2', name: 'General', quantity: 100, sold: 100 }, // fully sold — should NOT trigger scarcity
    ] as never);
    const insights = await generateInsights();
    expect(insights.find((i) => i.id === 'ticket-scarcity-t1')).toBeTruthy();
    expect(insights.find((i) => i.id === 'ticket-scarcity-t2')).toBeUndefined();
  });

  it('sorts insights with critical first, then warning, then info', async () => {
    vi.mocked(prisma.ticketType.findMany).mockResolvedValue([{ id: 't1', name: 'VIP', quantity: 100, sold: 98 }] as never); // info
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([{ id: 'z1', name: 'East', crowdReadings: [{ capacityPct: 80 }] }] as never); // warning
    vi.mocked(prisma.sOSAlert.findMany).mockResolvedValue([{ id: 's1', type: 'FIRE', zone: null }] as never); // critical

    const insights = await generateInsights();
    const severities = insights.map((i) => i.severity);
    expect(severities.indexOf('critical')).toBeLessThan(severities.indexOf('warning'));
    expect(severities.indexOf('warning')).toBeLessThan(severities.indexOf('info'));
  });

  it('caps the result at 20 insights', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({ id: `z${i}`, name: `Zone ${i}`, crowdReadings: [{ capacityPct: 95 }] })) as never
    );
    const insights = await generateInsights();
    expect(insights.length).toBeLessThanOrEqual(20);
  });
});
