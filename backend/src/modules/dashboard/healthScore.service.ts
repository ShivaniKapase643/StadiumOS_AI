import { prisma } from '../../config/db';
import { IncidentStatus, ParkingSlotStatus, SOSStatus, WorkOrderStatus } from '@prisma/client';
import { generateInsights } from '../ai/insights.service';

export type HealthStatus = 'green' | 'yellow' | 'orange' | 'red';

export interface CategoryScore {
  score: number;
  status: HealthStatus;
}

export interface StadiumHealthScore {
  overall: number;
  overallStatus: HealthStatus;
  categories: {
    security: CategoryScore;
    crowd: CategoryScore;
    parking: CategoryScore;
    medical: CategoryScore;
    energy: CategoryScore;
    maintenance: CategoryScore;
  };
  aiRecommendationCount: number;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFor(score: number): HealthStatus {
  if (score >= 90) return 'green';
  if (score >= 75) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
}

function category(score: number): CategoryScore {
  const clamped = clampScore(score);
  return { score: clamped, status: statusFor(clamped) };
}

/**
 * A single aggregate "how is the stadium doing right now" number, composed
 * from the same live data the Dashboard/Command Center KPIs already show —
 * this doesn't introduce a new data source, just a different rule-based
 * weighting of the existing ones (see insights.service.ts for the same
 * "simulated AI" pattern applied to per-issue recommendations instead of a
 * single score).
 */
export async function getStadiumHealthScore(): Promise<StadiumHealthScore> {
  const [openIncidents, openSos, openWorkOrders, crowdReadings, parkingSlots, parkingOccupied, energyReading, insights] =
    await Promise.all([
      prisma.incident.count({ where: { status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] } } }),
      prisma.sOSAlert.count({ where: { status: { in: [SOSStatus.OPEN, SOSStatus.DISPATCHED] } } }),
      prisma.workOrder.count({ where: { status: { in: [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] } } }),
      prisma.crowdDensityReading.findMany({ orderBy: { recordedAt: 'desc' }, take: 30 }),
      prisma.parkingSlot.count(),
      prisma.parkingSlot.count({ where: { status: ParkingSlotStatus.OCCUPIED } }),
      prisma.energyReading.findFirst({ orderBy: { recordedAt: 'desc' } }),
      generateInsights(),
    ]);

  const avgCrowdPct = crowdReadings.length ? crowdReadings.reduce((sum, r) => sum + r.capacityPct, 0) / crowdReadings.length : 0;
  const parkingOccupancyPct = parkingSlots ? (parkingOccupied / parkingSlots) * 100 : 0;

  const security = category(100 - Math.min(openIncidents * 8, 100));
  const crowd = category(avgCrowdPct <= 70 ? 100 : 100 - (avgCrowdPct - 70) * 2);
  const parking = category(parkingOccupancyPct <= 80 ? 100 : 100 - (parkingOccupancyPct - 80) * 3);
  const medical = category(100 - Math.min(openSos * 15, 100));
  const energy = category(
    energyReading && energyReading.consumptionKwh > 0
      ? 60 + Math.min(1, energyReading.solarGenKwh / energyReading.consumptionKwh) * 40
      : 80 // no reading yet — neutral default rather than penalizing
  );
  const maintenance = category(100 - Math.min(openWorkOrders * 5, 100));

  // Medical/security are weighted heaviest since they're safety-critical.
  const overall = clampScore(
    security.score * 0.2 + crowd.score * 0.2 + parking.score * 0.15 + medical.score * 0.25 + energy.score * 0.1 + maintenance.score * 0.1
  );

  return {
    overall,
    overallStatus: statusFor(overall),
    categories: { security, crowd, parking, medical, energy, maintenance },
    aiRecommendationCount: insights.length,
  };
}
