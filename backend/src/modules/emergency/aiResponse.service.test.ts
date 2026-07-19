import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    sOSAlert: { findUnique: vi.fn() },
    stadiumZone: { findMany: vi.fn(), findUnique: vi.fn() },
    crowdDensityReading: { findFirst: vi.fn() },
    parkingLot: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { generateIncidentActionPlan, simulateEvacuation } from './aiResponse.service';

const ZONE = { id: 'zone-1', stadiumId: 'stadium-1', name: 'East Stand', type: 'SEATING_BLOCK', x: 100, y: 100 };
const GATE_NEAR = { id: 'gate-1', name: 'Gate A', type: 'GATE', x: 110, y: 100, crowdReadings: [] };
const GATE_FAR = { id: 'gate-2', name: 'Gate B', type: 'GATE', x: 500, y: 500, crowdReadings: [] };
const MEDICAL = { id: 'med-1', name: 'Medical Room 1', type: 'MEDICAL', x: 120, y: 100, crowdReadings: [] };

describe('generateIncidentActionPlan (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 for a non-existent alert', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue(null);
    await expect(generateIncidentActionPlan('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('recommends security dispatch from the nearest gate, with a real distance-based ETA', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'SECURITY', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, GATE_FAR] as never);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);

    const plan = await generateIncidentActionPlan('a1');

    const securityStep = plan.steps.find((s) => s.id === 'dispatch-security');
    expect(securityStep?.action).toContain('Gate A'); // the nearer gate, not Gate B
    expect(securityStep?.etaMinutes).toBeGreaterThan(0);
  });

  it('only recommends a medical dispatch step for MEDICAL-type alerts', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'SECURITY', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, MEDICAL] as never);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);

    const plan = await generateIncidentActionPlan('a1');
    expect(plan.steps.find((s) => s.id === 'dispatch-medical')).toBeUndefined();
  });

  it('recommends closing the zone only when it is a SEATING_BLOCK at HIGH/CRITICAL density', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'MEDICAL', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, MEDICAL] as never);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.crowdDensityReading.findFirst).mockResolvedValue({ densityLevel: 'CRITICAL', capacityPct: 97 } as never);

    const plan = await generateIncidentActionPlan('a1');
    expect(plan.steps.find((s) => s.id === 'close-zone')).toBeTruthy();
  });

  it('does not recommend closing the zone when density is LOW', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'MEDICAL', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, MEDICAL] as never);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.crowdDensityReading.findFirst).mockResolvedValue({ densityLevel: 'LOW', capacityPct: 20 } as never);

    const plan = await generateIncidentActionPlan('a1');
    expect(plan.steps.find((s) => s.id === 'close-zone')).toBeUndefined();
  });

  it('recommends a parking redirect only when a lot is at or above 85% occupancy', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'SECURITY', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR] as never);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([
      { id: 'lot-1', name: 'Lot 1', slots: Array.from({ length: 10 }, (_, i) => ({ status: i < 9 ? 'OCCUPIED' : 'AVAILABLE' })) },
    ] as never);

    const plan = await generateIncidentActionPlan('a1');
    expect(plan.steps.find((s) => s.id === 'redirect-parking')?.action).toContain('Lot 1');
  });

  it('always includes a broadcast step with a generated safety message', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1', type: 'SECURITY', zone: ZONE } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkingLot.findMany).mockResolvedValue([]);

    const plan = await generateIncidentActionPlan('a1');
    const broadcast = plan.steps.find((s) => s.id === 'broadcast');
    expect(broadcast?.apply?.suggestedMessage).toContain(ZONE.name);
  });
});

describe('simulateEvacuation (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 for a non-existent zone', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(null);
    await expect(simulateEvacuation('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('throws 400 when the stadium has no gates configured', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(ZONE as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([]);
    await expect(simulateEvacuation(ZONE.id)).rejects.toMatchObject({ status: 400 });
  });

  it('picks the geometrically nearest gate as the fastest route', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(ZONE as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, GATE_FAR] as never);

    const result = await simulateEvacuation(ZONE.id);
    expect(result.fastest.gateName).toBe('Gate A');
  });

  it('suggests a congestion-aware alternative when the nearest gate is badly congested', async () => {
    // Distances are large enough canvas units that the congestion multiplier
    // (see CONGESTION_MULTIPLIER in aiResponse.service.ts) actually changes
    // which gate wins after rounding to whole minutes.
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(ZONE as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { ...GATE_NEAR, x: 900, y: 100, crowdReadings: [{ densityLevel: 'CRITICAL' }] }, // 800u away, jammed (2x)
      { ...GATE_FAR, x: 100, y: 1100, crowdReadings: [{ densityLevel: 'LOW' }] }, // 1000u away, clear (1x)
    ] as never);

    const result = await simulateEvacuation(ZONE.id);
    expect(result.fastest.gateName).toBe('Gate A'); // still nearer by raw distance
    expect(result.alternative).not.toBeNull();
    expect(result.alternative?.gateName).toBe('Gate B'); // but faster once congestion is factored in
    expect(result.reason).toContain('congestion');
  });

  it('returns no alternative when the nearest gate is also the least congested', async () => {
    vi.mocked(prisma.stadiumZone.findUnique).mockResolvedValue(ZONE as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([GATE_NEAR, GATE_FAR] as never);

    const result = await simulateEvacuation(ZONE.id);
    expect(result.alternative).toBeNull();
    expect(result.reason).toBeNull();
  });
});
