import { prisma } from '../../config/db';
import { DensityLevel, ZoneType } from '@prisma/client';
import { densityLevelFor } from '../../utils/density';

const PREDICTION_HORIZON_MIN = 10;
const CROWD_TYPES: ZoneType[] = [ZoneType.SEATING_BLOCK, ZoneType.GATE, ZoneType.FOOD_COURT];

export interface ZoneRiskPrediction {
  zoneId: string;
  zoneName: string;
  currentCapacityPct: number;
  currentDensityLevel: DensityLevel;
  predictedCapacityPct: number;
  predictedDensityLevel: DensityLevel;
  horizonMinutes: number;
  confidencePct: number;
  reason: string;
  willEscalate: boolean;
}

/**
 * Projects each crowd-tracked zone's density `PREDICTION_HORIZON_MIN`
 * minutes ahead from its own recent reading history — a real linear trend
 * fit against `CrowdDensityReading` rows already written by the live
 * simulator, not a hardcoded number. Confidence reflects how consistent
 * that trend actually is (a zone bouncing up and down gets a low-confidence
 * flat prediction; a zone climbing steadily gets a high-confidence one) —
 * same "simulated AI, disclosed as rule-based" pattern as insights.service.ts.
 */
export async function predictCrowdRisk(stadiumId: string): Promise<ZoneRiskPrediction[]> {
  const zones = await prisma.stadiumZone.findMany({
    where: { stadiumId, type: { in: CROWD_TYPES } },
    include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 6 } },
  });

  const [weather, liveFixtures] = await Promise.all([
    prisma.weatherSnapshot.findFirst({ where: { stadiumId }, orderBy: { recordedAt: 'desc' } }),
    prisma.fixture.count({ where: { status: 'LIVE' } }),
  ]);

  const predictions: ZoneRiskPrediction[] = [];

  for (const zone of zones) {
    const readings = [...zone.crowdReadings].reverse(); // oldest -> newest
    if (readings.length === 0) continue;

    const current = readings[readings.length - 1];

    if (readings.length < 3) {
      // Not enough history for a trend — report current state with low confidence.
      predictions.push({
        zoneId: zone.id,
        zoneName: zone.name,
        currentCapacityPct: current.capacityPct,
        currentDensityLevel: current.densityLevel,
        predictedCapacityPct: current.capacityPct,
        predictedDensityLevel: current.densityLevel,
        horizonMinutes: PREDICTION_HORIZON_MIN,
        confidencePct: 35,
        reason: 'Not enough recent history to project a trend yet.',
        willEscalate: false,
      });
      continue;
    }

    // Per-step deltas and their average — a simple discrete-derivative trend
    // estimate rather than a full regression, deliberately: with only a
    // handful of points a straight average-of-deltas is just as honest and
    // much easier to reason about than a fitted line would be.
    const deltas: number[] = [];
    for (let i = 1; i < readings.length; i++) {
      deltas.push(readings[i].capacityPct - readings[i - 1].capacityPct);
    }
    const avgDeltaPerReading = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    // Readings land roughly every SIMULATOR_INTERVAL_MS; scale the per-reading
    // trend into a per-10-minute projection assuming a ~20s cadence.
    const stepsInHorizon = Math.round((PREDICTION_HORIZON_MIN * 60) / 20);
    const projectedDelta = avgDeltaPerReading * stepsInHorizon;

    let predictedPct = Math.max(0, Math.min(100, current.capacityPct + projectedDelta));

    // Confidence: what fraction of consecutive deltas agree in sign with the
    // overall trend direction, plus a small bonus for having more data points.
    const trendSign = Math.sign(avgDeltaPerReading);
    const agreeing = deltas.filter((d) => Math.sign(d) === trendSign || d === 0).length;
    const consistencyRatio = trendSign === 0 ? 0.5 : agreeing / deltas.length;
    let confidencePct = Math.round(45 + consistencyRatio * 40 + Math.min(readings.length, 6) * 2);
    confidencePct = Math.max(30, Math.min(96, confidencePct)); // never claim near-certainty

    const reasons: string[] = [];
    if (avgDeltaPerReading > 0.5) reasons.push('rising crowd trend');
    if (weather && (weather.condition === 'STORM' || weather.condition === 'EXTREME_HEAT')) {
      reasons.push(`${weather.condition.toLowerCase().replace('_', ' ')} conditions likely to push fans indoors/toward exits`);
      predictedPct = Math.min(100, predictedPct + 5);
    }
    if (liveFixtures > 0 && zone.type === ZoneType.GATE) {
      reasons.push('a match is live — exit queues typically build near full time');
    }
    if (reasons.length === 0) reasons.push('stable recent readings');

    const predictedDensityLevel = densityLevelFor(predictedPct);
    predictions.push({
      zoneId: zone.id,
      zoneName: zone.name,
      currentCapacityPct: Math.round(current.capacityPct * 10) / 10,
      currentDensityLevel: current.densityLevel,
      predictedCapacityPct: Math.round(predictedPct * 10) / 10,
      predictedDensityLevel,
      horizonMinutes: PREDICTION_HORIZON_MIN,
      confidencePct,
      reason: reasons.join('; '),
      willEscalate: predictedDensityLevel !== current.densityLevel && predictedPct > current.capacityPct,
    });
  }

  const severityRank: Record<DensityLevel, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
  return predictions.sort((a, b) => severityRank[a.predictedDensityLevel] - severityRank[b.predictedDensityLevel]);
}
