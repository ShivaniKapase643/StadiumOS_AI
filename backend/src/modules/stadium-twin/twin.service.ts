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
