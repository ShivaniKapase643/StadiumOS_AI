import { prisma } from '../../config/db';
import { TicketStatus, PaymentStatus, IncidentStatus, SOSStatus, WorkOrderStatus, ParkingSlotStatus } from '@prisma/client';

export async function getKpis() {
  const [
    ticketsScanned,
    totalTicketsValid,
    revenueAgg,
    crowdReadings,
    parkingSlots,
    parkingOccupied,
    energyReading,
    openIncidents,
    openSos,
    openWorkOrders,
    weather,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.USED } }),
    prisma.ticket.count({ where: { status: { in: [TicketStatus.VALID, TicketStatus.USED] } } }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS }, _sum: { amount: true } }),
    prisma.crowdDensityReading.findMany({ orderBy: { recordedAt: 'desc' }, take: 30 }),
    prisma.parkingSlot.count(),
    prisma.parkingSlot.count({ where: { status: ParkingSlotStatus.OCCUPIED } }),
    prisma.energyReading.findFirst({ orderBy: { recordedAt: 'desc' } }),
    prisma.incident.count({ where: { status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] } } }),
    prisma.sOSAlert.count({ where: { status: { in: [SOSStatus.OPEN, SOSStatus.DISPATCHED] } } }),
    prisma.workOrder.count({ where: { status: { in: [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] } } }),
    prisma.weatherSnapshot.findFirst({ orderBy: { recordedAt: 'desc' } }),
  ]);

  const avgCrowdPct = crowdReadings.length
    ? crowdReadings.reduce((sum, r) => sum + r.capacityPct, 0) / crowdReadings.length
    : 0;

  return {
    attendance: { scanned: ticketsScanned, totalIssued: totalTicketsValid },
    revenue: { totalCollected: Number(revenueAgg._sum.amount ?? 0) },
    crowd: { averageCapacityPct: Math.round(avgCrowdPct * 10) / 10 },
    parking: {
      totalSlots: parkingSlots,
      occupied: parkingOccupied,
      occupancyPct: parkingSlots ? Math.round((parkingOccupied / parkingSlots) * 1000) / 10 : 0,
    },
    energy: {
      consumptionKwh: energyReading?.consumptionKwh ?? 0,
      solarGenKwh: energyReading?.solarGenKwh ?? 0,
    },
    security: { openIncidents },
    emergency: { openAlerts: openSos },
    maintenance: { openWorkOrders },
    weather: weather
      ? {
          temperatureC: weather.temperatureC,
          condition: weather.condition,
          windSpeedKmh: weather.windSpeedKmh,
          humidityPct: weather.humidityPct,
        }
      : null,
  };
}

export async function getAttendanceTrend() {
  const readings = await prisma.crowdDensityReading.findMany({
    orderBy: { recordedAt: 'asc' },
    take: 200,
  });

  const byBucket = new Map<string, { total: number; count: number }>();
  for (const r of readings) {
    const bucket = new Date(r.recordedAt).toISOString().slice(0, 16); // per-minute bucket
    const entry = byBucket.get(bucket) ?? { total: 0, count: 0 };
    entry.total += r.count;
    entry.count += 1;
    byBucket.set(bucket, entry);
  }

  return Array.from(byBucket.entries()).map(([time, v]) => ({
    time,
    attendance: Math.round(v.total / v.count),
  }));
}

export async function getRevenueTrend() {
  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.SUCCESS },
    orderBy: { createdAt: 'asc' },
  });

  const byDay = new Map<string, number>();
  for (const p of payments) {
    const day = new Date(p.createdAt).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(p.amount));
  }

  return Array.from(byDay.entries()).map(([date, revenue]) => ({ date, revenue }));
}

export async function getCrowdByZone() {
  const zones = await prisma.stadiumZone.findMany({
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });

  return zones
    .filter((z) => z.crowdReadings.length > 0)
    .map((z) => ({
      zoneName: z.name,
      capacityPct: z.crowdReadings[0].capacityPct,
      densityLevel: z.crowdReadings[0].densityLevel,
    }));
}

export async function getTicketTierSplit() {
  const groups = await prisma.ticket.groupBy({
    by: ['ticketTypeId'],
    _count: { _all: true },
    where: { status: { in: [TicketStatus.VALID, TicketStatus.USED] } },
  });

  const ticketTypes = await prisma.ticketType.findMany({
    where: { id: { in: groups.map((g) => g.ticketTypeId) } },
  });

  const tierTotals = new Map<string, number>();
  for (const g of groups) {
    const tt = ticketTypes.find((t) => t.id === g.ticketTypeId);
    if (!tt) continue;
    tierTotals.set(tt.tier, (tierTotals.get(tt.tier) ?? 0) + g._count._all);
  }

  return Array.from(tierTotals.entries()).map(([tier, count]) => ({ tier, count }));
}

export async function getUpcomingMatches() {
  return prisma.fixture.findMany({
    where: { scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
    include: {
      homeTeam: true,
      awayTeam: true,
      tournament: true,
      zone: true,
    },
  });
}

export async function getRecentActivity() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true, role: true } } },
  });
}
