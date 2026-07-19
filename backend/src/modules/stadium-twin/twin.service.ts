import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { Prisma, ZoneStatus, ZoneType } from '@prisma/client';

export async function getStadiumOverview(stadiumId?: string) {
  const stadium = stadiumId
    ? await prisma.stadium.findUnique({ where: { id: stadiumId } })
    : await prisma.stadium.findFirst();

  if (!stadium) throw ApiError.notFound('No stadium configured');
  return stadium;
}

export async function listZones(stadiumId: string, type?: ZoneType) {
  return prisma.stadiumZone.findMany({
    where: { stadiumId, ...(type ? { type } : {}) },
    include: {
      crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 },
      equipment: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createZone(input: {
  stadiumId: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  capacity?: number;
  metadata?: Record<string, unknown>;
}) {
  return prisma.stadiumZone.create({
    data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined },
  });
}

export async function updateZoneStatus(zoneId: string, status: ZoneStatus) {
  const zone = await prisma.stadiumZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw ApiError.notFound('Zone not found');
  return prisma.stadiumZone.update({ where: { id: zoneId }, data: { status } });
}

export async function deleteZone(zoneId: string) {
  const zone = await prisma.stadiumZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw ApiError.notFound('Zone not found');
  await prisma.stadiumZone.delete({ where: { id: zoneId } });
}

export async function getLiveSnapshot(stadiumId: string) {
  const [zones, parkingLots, equipment, sosAlerts] = await Promise.all([
    prisma.stadiumZone.findMany({
      where: { stadiumId },
      include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    }),
    prisma.parkingLot.findMany({
      where: { stadiumId },
      include: { slots: true },
    }),
    prisma.equipment.findMany({ where: { zone: { stadiumId } } }),
    prisma.sOSAlert.findMany({
      where: { zone: { stadiumId }, status: { in: ['OPEN', 'DISPATCHED'] } },
      include: { zone: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { zones, parkingLots, equipment, activeAlerts: sosAlerts };
}

export async function getReplayTimeRange(stadiumId: string) {
  const [earliest, latest] = await Promise.all([
    prisma.crowdDensityReading.findFirst({ where: { zone: { stadiumId } }, orderBy: { recordedAt: 'asc' } }),
    prisma.crowdDensityReading.findFirst({ where: { zone: { stadiumId } }, orderBy: { recordedAt: 'desc' } }),
  ]);
  return { earliest: earliest?.recordedAt ?? null, latest: latest?.recordedAt ?? null };
}

/**
 * Live Stadium Replay — reconstructs "what the twin looked like" at a past
 * moment from the crowd-density history the live simulator has already been
 * writing every SIMULATOR_INTERVAL_MS. One bounded query for every zone's
 * readings in a lookback window (not one query per zone) keeps this cheap
 * regardless of how many zones the stadium has.
 */
export async function getReplaySnapshot(stadiumId: string, at: Date) {
  const zones = await prisma.stadiumZone.findMany({ where: { stadiumId } });
  const zoneIds = zones.map((z) => z.id);

  const lookbackStart = new Date(at.getTime() - 60 * 60 * 1000); // 1hr lookback is plenty given the ~20s write cadence
  const readings = await prisma.crowdDensityReading.findMany({
    where: { zoneId: { in: zoneIds }, recordedAt: { gte: lookbackStart, lte: at } },
    orderBy: { recordedAt: 'desc' },
  });

  const latestByZone = new Map<string, (typeof readings)[number]>();
  for (const r of readings) {
    if (!latestByZone.has(r.zoneId)) latestByZone.set(r.zoneId, r); // first hit per zone is the most recent, since already desc-sorted
  }

  const zoneSnapshots = zones.map((zone) => {
    const reading = latestByZone.get(zone.id);
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      x: zone.x,
      y: zone.y,
      type: zone.type,
      capacityPct: reading?.capacityPct ?? null,
      densityLevel: reading?.densityLevel ?? null,
    };
  });

  const eventWindowStart = new Date(at.getTime() - 5 * 60 * 1000);
  const [alerts, incidents] = await Promise.all([
    prisma.sOSAlert.findMany({
      where: { zone: { stadiumId }, createdAt: { gte: eventWindowStart, lte: at } },
      include: { zone: true },
    }),
    prisma.incident.findMany({
      where: { zone: { stadiumId }, createdAt: { gte: eventWindowStart, lte: at } },
      include: { zone: true },
    }),
  ]);

  const recentEvents = [
    ...alerts.map((a) => ({ kind: 'sos' as const, label: `${a.type} alert`, zoneName: a.zone?.name, at: a.createdAt })),
    ...incidents.map((i) => ({ kind: 'incident' as const, label: i.type, zoneName: i.zone?.name, at: i.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return { at, zones: zoneSnapshots, recentEvents };
}
