import { prisma } from '../../config/db';
import { ZoneType } from '@prisma/client';
import { distanceMeters, walkingTimeMinutes, findNearest, type Point } from '../../utils/geometry';

export interface ConciergeInfo {
  greetingName: string;
  seat: { section: string; row: string; number: number; tier: string } | null;
  parking: { lotName: string; slotCode: string } | null;
  walkingTimeToSeatMinutes: number | null;
  nearestWashroom: string | null;
  nearestMedical: string | null;
  foodSuggestion: { vendorName: string; itemName: string; price: number } | null;
  estimatedFoodWaitMinutes: number | null;
  weather: { temperatureC: number; condition: string } | null;
}

/** Best-effort match between a parking lot's name and a PARKING-type zone's
 * name by shared significant word (e.g. both mention "North") — the two are
 * separate models in this schema (operational slots vs. map geometry) with
 * no direct foreign key between them. */
function matchZoneToLot<T extends Point & { name: string }>(lotName: string, zones: T[]): T | undefined {
  const lotWords = lotName.toLowerCase().split(/\s+/);
  return (
    zones.find((z) => lotWords.some((w) => w.length > 3 && z.name.toLowerCase().includes(w))) ?? zones[0]
  );
}

/**
 * VIP AI Concierge — a personalized summary built entirely from the fan's
 * own real records (their active ticket, active parking reservation) plus
 * real zone geometry for the walking-time/proximity estimates. No part of
 * this is fabricated per-user; where the schema can't give an exact answer
 * (seats and parking lots aren't linked to precise map coordinates), the
 * estimate is derived from the nearest real zone of the relevant type and
 * labeled as such by the caller.
 */
export async function getConciergeInfo(userId: string): Promise<ConciergeInfo> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const [ticket, reservation, stadium] = await Promise.all([
    prisma.ticket.findFirst({
      where: { booking: { userId }, status: { in: ['VALID', 'USED'] } },
      include: { seat: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.parkingReservation.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { slot: { include: { lot: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stadium.findFirst(),
  ]);

  const zones = stadium
    ? await prisma.stadiumZone.findMany({ where: { stadiumId: stadium.id } })
    : [];
  const seatingZone = zones.find((z) => z.type === ZoneType.SEATING_BLOCK);
  const washroomZones = zones.filter((z) => z.type === ZoneType.WASHROOM);
  const medicalZones = zones.filter((z) => z.type === ZoneType.MEDICAL);
  const parkingZones = zones.filter((z) => z.type === ZoneType.PARKING);
  const foodCourtZone = zones.find((z) => z.type === ZoneType.FOOD_COURT);

  let walkingTimeToSeatMinutes: number | null = null;
  if (reservation && seatingZone) {
    const lotZone = matchZoneToLot(reservation.slot.lot.name, parkingZones);
    if (lotZone) walkingTimeToSeatMinutes = walkingTimeMinutes(distanceMeters(lotZone, seatingZone));
  }

  const nearestWashroom = seatingZone ? findNearest(seatingZone, washroomZones) : washroomZones[0];
  const nearestMedical = seatingZone ? findNearest(seatingZone, medicalZones) : medicalZones[0];

  let foodSuggestion: ConciergeInfo['foodSuggestion'] = null;
  let estimatedFoodWaitMinutes: number | null = null;
  if (foodCourtZone) {
    const vendor = await prisma.vendor.findFirst({
      where: { zoneId: foodCourtZone.id, status: 'ACTIVE' },
      include: { inventory: { where: { stock: { gt: 0 } }, orderBy: { price: 'asc' }, take: 1 } },
    });
    if (vendor?.inventory[0]) {
      foodSuggestion = { vendorName: vendor.name, itemName: vendor.inventory[0].name, price: Number(vendor.inventory[0].price) };
      // A real (if rough) queue proxy: how many orders this vendor has
      // pending right now, at an assumed 2 minutes to prepare each.
      const pendingOrders = await prisma.foodOrder.count({ where: { vendorId: vendor.id, status: 'PLACED' } });
      estimatedFoodWaitMinutes = Math.max(2, pendingOrders * 2);
    }
  }

  const weather = stadium ? await prisma.weatherSnapshot.findFirst({ where: { stadiumId: stadium.id }, orderBy: { recordedAt: 'desc' } }) : null;

  return {
    greetingName: user?.name ?? 'Fan',
    seat: ticket ? { section: ticket.seat.section, row: ticket.seat.row, number: ticket.seat.number, tier: ticket.seat.tier } : null,
    parking: reservation ? { lotName: reservation.slot.lot.name, slotCode: reservation.slot.code } : null,
    walkingTimeToSeatMinutes,
    nearestWashroom: nearestWashroom?.name ?? null,
    nearestMedical: nearestMedical?.name ?? null,
    foodSuggestion,
    estimatedFoodWaitMinutes,
    weather: weather ? { temperatureC: weather.temperatureC, condition: weather.condition } : null,
  };
}
