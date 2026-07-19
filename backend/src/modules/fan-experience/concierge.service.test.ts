import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn() },
    parkingReservation: { findFirst: vi.fn() },
    stadium: { findFirst: vi.fn() },
    stadiumZone: { findMany: vi.fn() },
    vendor: { findFirst: vi.fn() },
    foodOrder: { count: vi.fn() },
    weatherSnapshot: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { getConciergeInfo } from './concierge.service';

const STADIUM = { id: 'stadium-1' };
const SEATING_ZONE = { id: 'z-seat', type: 'SEATING_BLOCK', name: 'East Stand', x: 500, y: 300 };
const WASHROOM_NEAR = { id: 'z-wash-1', type: 'WASHROOM', name: 'Washroom A', x: 510, y: 300 };
const WASHROOM_FAR = { id: 'z-wash-2', type: 'WASHROOM', name: 'Washroom B', x: 900, y: 900 };

function mockBase() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', name: 'Jai Fan' } as never);
  vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.parkingReservation.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.stadium.findFirst).mockResolvedValue(STADIUM as never);
  vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([SEATING_ZONE, WASHROOM_NEAR, WASHROOM_FAR] as never);
  vi.mocked(prisma.vendor.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.foodOrder.count).mockResolvedValue(0);
  vi.mocked(prisma.weatherSnapshot.findFirst).mockResolvedValue(null);
}

describe('getConciergeInfo (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBase();
  });

  it('greets the user by their real name', async () => {
    const info = await getConciergeInfo('u1');
    expect(info.greetingName).toBe('Jai Fan');
  });

  it('falls back to a generic greeting when the user record is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const info = await getConciergeInfo('u1');
    expect(info.greetingName).toBe('Fan');
  });

  it('includes real seat info only when the user has an active ticket', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
      seat: { section: 'A', row: 'A', number: 12, tier: 'VIP' },
    } as never);
    const info = await getConciergeInfo('u1');
    expect(info.seat).toEqual({ section: 'A', row: 'A', number: 12, tier: 'VIP' });
  });

  it('reports no seat when the user has no active ticket', async () => {
    const info = await getConciergeInfo('u1');
    expect(info.seat).toBeNull();
  });

  it('picks the geometrically nearest washroom to the seating zone', async () => {
    const info = await getConciergeInfo('u1');
    expect(info.nearestWashroom).toBe('Washroom A');
  });

  it('computes a walking-time estimate only when the user has an active parking reservation', async () => {
    vi.mocked(prisma.parkingReservation.findFirst).mockResolvedValue({
      slot: { code: 'N12', lot: { name: 'North Parking Lot' } },
    } as never);
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      SEATING_ZONE,
      WASHROOM_NEAR,
      { id: 'z-park', type: 'PARKING', name: 'Parking Zone North', x: 200, y: 30 },
    ] as never);

    const info = await getConciergeInfo('u1');
    expect(info.parking).toEqual({ lotName: 'North Parking Lot', slotCode: 'N12' });
    expect(info.walkingTimeToSeatMinutes).toBeGreaterThan(0);
  });

  it('reports no walking time when there is no active parking reservation', async () => {
    const info = await getConciergeInfo('u1');
    expect(info.walkingTimeToSeatMinutes).toBeNull();
    expect(info.parking).toBeNull();
  });

  it('estimates the food wait from real pending-order counts at the suggested vendor', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      SEATING_ZONE,
      { id: 'z-food', type: 'FOOD_COURT', name: 'Main Food Court', x: 500, y: 320 },
    ] as never);
    vi.mocked(prisma.vendor.findFirst).mockResolvedValue({
      id: 'v1',
      name: "Grace's Grill",
      inventory: [{ name: 'Burger', price: 8 }],
    } as never);
    vi.mocked(prisma.foodOrder.count).mockResolvedValue(3);

    const info = await getConciergeInfo('u1');
    expect(info.foodSuggestion).toEqual({ vendorName: "Grace's Grill", itemName: 'Burger', price: 8 });
    expect(info.estimatedFoodWaitMinutes).toBe(6); // 3 pending orders * 2 min
  });

  it('suggests no food when no food court/vendor is configured', async () => {
    const info = await getConciergeInfo('u1');
    expect(info.foodSuggestion).toBeNull();
    expect(info.estimatedFoodWaitMinutes).toBeNull();
  });
});
