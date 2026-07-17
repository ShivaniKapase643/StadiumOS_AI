import { prisma } from '../../config/db';

export async function getCongestionOverview() {
  const zones = await prisma.stadiumZone.findMany({
    where: { type: { in: ['SEATING_BLOCK', 'GATE', 'FOOD_COURT'] } },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 5 } },
  });

  return zones.map((zone) => {
    const readings = zone.crowdReadings;
    const latest = readings[0]?.capacityPct ?? 0;
    // Simple linear trend over the last few readings (oldest -> newest).
    let trend = 0;
    if (readings.length >= 2) {
      const ordered = [...readings].reverse();
      trend = (ordered[ordered.length - 1].capacityPct - ordered[0].capacityPct) / ordered.length;
    }
    const predictedNextPct = Math.max(0, Math.min(100, latest + trend * 2));

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (predictedNextPct >= 90) riskLevel = 'CRITICAL';
    else if (predictedNextPct >= 70) riskLevel = 'HIGH';
    else if (predictedNextPct >= 40) riskLevel = 'MODERATE';

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      zoneType: zone.type,
      currentPct: latest,
      trendPerReading: Math.round(trend * 10) / 10,
      predictedNextPct: Math.round(predictedNextPct * 10) / 10,
      riskLevel,
    };
  });
}

export async function getQueueMonitoring() {
  const gates = await prisma.stadiumZone.findMany({
    where: { type: 'GATE' },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });

  const THROUGHPUT_PER_MIN = 40; // assumed processing rate per gate lane

  return gates.map((gate) => {
    const count = gate.crowdReadings[0]?.count ?? 0;
    const estimatedWaitMinutes = Math.round(count / THROUGHPUT_PER_MIN);
    return {
      zoneId: gate.id,
      zoneName: gate.name,
      queueLength: count,
      estimatedWaitMinutes,
      status: estimatedWaitMinutes > 15 ? 'CONGESTED' : estimatedWaitMinutes > 5 ? 'BUSY' : 'CLEAR',
    };
  });
}

export async function getPeakHourAnalysis() {
  const readings = await prisma.crowdDensityReading.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 500,
  });

  const byHour = new Map<number, { total: number; count: number }>();
  for (const r of readings) {
    const hour = new Date(r.recordedAt).getUTCHours();
    const entry = byHour.get(hour) ?? { total: 0, count: 0 };
    entry.total += r.capacityPct;
    entry.count += 1;
    byHour.set(hour, entry);
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const entry = byHour.get(hour);
    return { hour, averageCapacityPct: entry ? Math.round((entry.total / entry.count) * 10) / 10 : 0 };
  });
}
