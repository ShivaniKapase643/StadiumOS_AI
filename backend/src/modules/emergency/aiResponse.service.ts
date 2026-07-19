import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { DensityLevel, ZoneType } from '@prisma/client';
import { distanceMeters, walkingTimeMinutes, findNearest } from '../../utils/geometry';

const CONGESTION_MULTIPLIER: Record<DensityLevel, number> = {
  LOW: 1,
  MODERATE: 1.2,
  HIGH: 1.5,
  CRITICAL: 2,
};

export interface ActionPlanStep {
  id: string;
  action: string;
  detail: string;
  etaMinutes?: number;
  apply?: { kind: 'dispatchAmbulance' | 'closeZone' | 'broadcast'; targetId?: string; suggestedMessage?: string };
}

export interface IncidentActionPlan {
  alertId: string;
  zoneName: string | null;
  steps: ActionPlanStep[];
  overallEtaMinutes: number;
}

/**
 * Rule-based response plan generator — reads real zone geometry, live crowd
 * density, and parking occupancy to produce a checklist of recommended
 * actions with real ETAs (see utils/geometry.ts), the same "simulated AI"
 * pattern as insights.service.ts. Not a call to an external incident-response
 * model; every recommendation is derivable from data already in the DB.
 */
export async function generateIncidentActionPlan(sosAlertId: string): Promise<IncidentActionPlan> {
  const alert = await prisma.sOSAlert.findUnique({ where: { id: sosAlertId }, include: { zone: true } });
  if (!alert) throw ApiError.notFound('SOS alert not found');

  const steps: ActionPlanStep[] = [];

  if (!alert.zone) {
    steps.push({
      id: 'dispatch-security',
      action: 'Dispatch nearest available security team',
      detail: 'No specific zone was attached to this alert — dispatch to the reporting user\'s last known location.',
    });
    return { alertId: alert.id, zoneName: null, steps, overallEtaMinutes: 3 };
  }

  const zone = alert.zone;
  const stadiumZones = await prisma.stadiumZone.findMany({
    where: { stadiumId: zone.stadiumId, id: { not: zone.id } },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });

  const gates = stadiumZones.filter((z) => z.type === ZoneType.GATE);
  const medicalRooms = stadiumZones.filter((z) => z.type === ZoneType.MEDICAL);
  const nearestGate = findNearest(zone, gates);
  const nearestMedical = findNearest(zone, medicalRooms);

  const etas: number[] = [];

  // Security dispatch — always recommended, from the nearest gate (where
  // security posts are concentrated in this stadium's layout).
  if (nearestGate) {
    const meters = distanceMeters(zone, nearestGate);
    const etaMinutes = walkingTimeMinutes(meters);
    etas.push(etaMinutes);
    steps.push({
      id: 'dispatch-security',
      action: `Dispatch nearest security team from ${nearestGate.name}`,
      detail: `${meters}m away — estimated arrival in ${etaMinutes} min.`,
      etaMinutes,
    });
  } else {
    steps.push({ id: 'dispatch-security', action: 'Dispatch nearest available security team', detail: 'No gate zones configured for this stadium.' });
  }

  // Medical dispatch — only if this is plausibly a medical-relevant alert
  // (medical type, or any alert — better to over-recommend medical presence
  // than under-recommend it for a safety-critical response).
  if (alert.type === 'MEDICAL' && nearestMedical) {
    const meters = distanceMeters(zone, nearestMedical);
    const etaMinutes = walkingTimeMinutes(meters);
    etas.push(etaMinutes);
    steps.push({
      id: 'dispatch-medical',
      action: `Dispatch medical team from ${nearestMedical.name}`,
      detail: `${meters}m away — estimated arrival in ${etaMinutes} min.`,
      etaMinutes,
      apply: { kind: 'dispatchAmbulance', targetId: alert.id },
    });
  }

  // Open the nearest gate as an additional/emergency exit.
  if (nearestGate) {
    steps.push({
      id: 'open-gate',
      action: `Open ${nearestGate.name} as an emergency exit`,
      detail: 'Ensure the gate is staffed and unobstructed for evacuating fans.',
    });
  }

  // If the incident zone itself is a seating block under elevated density,
  // recommend closing/evacuating it.
  if (zone.type === ZoneType.SEATING_BLOCK) {
    const latest = await prisma.crowdDensityReading.findFirst({ where: { zoneId: zone.id }, orderBy: { recordedAt: 'desc' } });
    if (latest && (latest.densityLevel === 'HIGH' || latest.densityLevel === 'CRITICAL')) {
      steps.push({
        id: 'close-zone',
        action: `Evacuate and close ${zone.name}`,
        detail: `Currently at ${latest.capacityPct.toFixed(0)}% capacity (${latest.densityLevel}) — clear the section in a controlled manner.`,
        apply: { kind: 'closeZone', targetId: zone.id },
      });
    }
  }

  // Parking redirect — only if a nearby lot is genuinely near capacity.
  const lots = await prisma.parkingLot.findMany({ where: { stadiumId: zone.stadiumId }, include: { slots: true } });
  const congestedLot = lots.find((lot) => {
    const total = lot.slots.length || 1;
    const occupied = lot.slots.filter((s) => s.status === 'OCCUPIED').length;
    return occupied / total >= 0.85;
  });
  if (congestedLot) {
    steps.push({
      id: 'redirect-parking',
      action: `Redirect incoming traffic away from ${congestedLot.name}`,
      detail: 'This lot is near capacity — update signage to route arrivals to an alternate lot.',
    });
  }

  // Broadcast recommendation — always included for a live incident.
  const suggestedMessage = `Attention: an incident has been reported near ${zone.name}. Please remain calm and follow staff instructions${
    nearestGate ? ` toward ${nearestGate.name}` : ''
  }.`;
  steps.push({
    id: 'broadcast',
    action: 'Broadcast an evacuation/safety message',
    detail: suggestedMessage,
    apply: { kind: 'broadcast', suggestedMessage },
  });

  return {
    alertId: alert.id,
    zoneName: zone.name,
    steps,
    overallEtaMinutes: etas.length ? Math.max(...etas) : 3,
  };
}

export interface EvacuationRoute {
  gateName: string;
  distanceMeters: number;
  etaMinutes: number;
  densityLevel: DensityLevel | 'UNKNOWN';
}

export interface EvacuationPlanResult {
  fromZoneName: string;
  fastest: EvacuationRoute;
  alternative: EvacuationRoute | null;
  reason: string | null;
}

/**
 * Ranks every gate in the stadium by (distance, live congestion) and returns
 * the geometrically-fastest route plus a congestion-aware alternative when
 * one exists and is meaningfully different — real zone coordinates and real
 * live crowd-density readings, not a scripted answer.
 */
export async function simulateEvacuation(zoneId: string): Promise<EvacuationPlanResult> {
  const zone = await prisma.stadiumZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw ApiError.notFound('Zone not found');

  const gates = await prisma.stadiumZone.findMany({
    where: { stadiumId: zone.stadiumId, type: ZoneType.GATE, id: { not: zone.id } },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
  });
  if (gates.length === 0) throw ApiError.badRequest('No gate zones configured for this stadium');

  const routes: EvacuationRoute[] = gates.map((gate) => {
    const meters = distanceMeters(zone, gate);
    const density = gate.crowdReadings[0]?.densityLevel;
    const congestionAdjustedEta = walkingTimeMinutes(meters, density ? CONGESTION_MULTIPLIER[density] : 1);
    return {
      gateName: gate.name,
      distanceMeters: meters,
      etaMinutes: congestionAdjustedEta,
      densityLevel: density ?? 'UNKNOWN',
    };
  });

  const fastestByDistance = [...routes].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
  const fastestByCongestionAdjustedTime = [...routes].sort((a, b) => a.etaMinutes - b.etaMinutes)[0];

  const alternative =
    fastestByCongestionAdjustedTime.gateName !== fastestByDistance.gateName ? fastestByCongestionAdjustedTime : null;

  return {
    fromZoneName: zone.name,
    fastest: fastestByDistance,
    alternative,
    reason: alternative
      ? `${fastestByDistance.gateName} is closer, but ${alternative.gateName} is faster overall due to ${
          fastestByDistance.densityLevel === 'UNKNOWN' ? 'current conditions' : `${fastestByDistance.densityLevel.toLowerCase()} congestion at the nearer gate`
        }.`
      : null,
  };
}
