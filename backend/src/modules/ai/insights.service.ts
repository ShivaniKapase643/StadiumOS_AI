import { prisma } from '../../config/db';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  recommendation: string;
  zoneName?: string;
}

/**
 * Rule-based operational recommendation engine. Reads current live state
 * (crowd density, parking occupancy, weather, incidents, equipment health)
 * and produces human-readable recommendations — no external LLM/AI call,
 * consistent with the platform's "simulated AI" modules.
 */
export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];

  const [zones, parkingLots, weather, openIncidents, openSos, equipment, ticketTypes] = await Promise.all([
    prisma.stadiumZone.findMany({
      include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    }),
    prisma.parkingLot.findMany({ include: { slots: true } }),
    prisma.weatherSnapshot.findFirst({ orderBy: { recordedAt: 'desc' } }),
    prisma.incident.findMany({ where: { status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    prisma.sOSAlert.findMany({ where: { status: { in: ['OPEN', 'DISPATCHED'] } }, include: { zone: true } }),
    prisma.equipment.findMany({ where: { status: { in: ['CRITICAL', 'OFFLINE', 'WARNING'] } }, include: { zone: true } }),
    prisma.ticketType.findMany(),
  ]);

  // Crowd density / congestion
  for (const zone of zones) {
    const reading = zone.crowdReadings[0];
    if (!reading) continue;
    if (reading.capacityPct >= 90) {
      insights.push({
        id: `crowd-critical-${zone.id}`,
        category: 'Crowd Intelligence',
        severity: 'critical',
        title: `${zone.name} at critical capacity (${reading.capacityPct.toFixed(0)}%)`,
        recommendation: `Open an additional lane or gate near ${zone.name} and consider temporarily redirecting fans to lower-density zones.`,
        zoneName: zone.name,
      });
    } else if (reading.capacityPct >= 75) {
      insights.push({
        id: `crowd-high-${zone.id}`,
        category: 'Crowd Intelligence',
        severity: 'warning',
        title: `${zone.name} approaching high density (${reading.capacityPct.toFixed(0)}%)`,
        recommendation: `Deploy volunteers to guide flow at ${zone.name} and monitor for further increases over the next 10 minutes.`,
        zoneName: zone.name,
      });
    }
  }

  // Parking
  for (const lot of parkingLots) {
    const total = lot.slots.length || 1;
    const occupied = lot.slots.filter((s) => s.status === 'OCCUPIED').length;
    const pct = (occupied / total) * 100;
    if (pct >= 90) {
      insights.push({
        id: `parking-${lot.id}`,
        category: 'Smart Parking',
        severity: 'warning',
        title: `${lot.name} is ${pct.toFixed(0)}% full`,
        recommendation: `Redirect incoming vehicles to alternate parking lots and update digital signage for ${lot.name}.`,
      });
    }
  }

  // Weather
  if (weather) {
    if (weather.condition === 'STORM') {
      insights.push({
        id: 'weather-storm',
        category: 'Weather Impact',
        severity: 'critical',
        title: 'Storm conditions detected',
        recommendation: 'Activate emergency shelter protocol and pause outdoor concession operations until conditions clear.',
      });
    } else if (weather.condition === 'EXTREME_HEAT') {
      insights.push({
        id: 'weather-heat',
        category: 'Weather Impact',
        severity: 'warning',
        title: `High temperature (${weather.temperatureC}°C)`,
        recommendation: 'Open additional hydration stations and increase medical team visibility in seating blocks.',
      });
    }
  }

  // Security incidents
  if (openIncidents.length >= 3) {
    insights.push({
      id: 'security-load',
      category: 'Security',
      severity: 'warning',
      title: `${openIncidents.length} open security incidents`,
      recommendation: 'Consider reallocating patrol officers from low-priority zones to support incident response.',
    });
  }

  // Emergency alerts
  for (const sos of openSos) {
    insights.push({
      id: `sos-${sos.id}`,
      category: 'Emergency Response',
      severity: 'critical',
      title: `Active ${sos.type.toLowerCase()} alert${sos.zone ? ` near ${sos.zone.name}` : ''}`,
      recommendation:
        sos.type === 'MEDICAL'
          ? 'Dispatch the nearest medical team and clear the surrounding path for an ambulance if needed.'
          : 'Dispatch security personnel immediately and establish a perimeter.',
      zoneName: sos.zone?.name,
    });
  }

  // Equipment / predictive maintenance
  for (const eq of equipment) {
    if (eq.status === 'OFFLINE' || eq.status === 'CRITICAL') {
      insights.push({
        id: `equipment-${eq.id}`,
        category: 'Predictive Maintenance',
        severity: 'critical',
        title: `${eq.name} reporting ${eq.status.toLowerCase()} health`,
        recommendation: `Dispatch a maintenance technician to ${eq.zone.name} to inspect ${eq.name} before the next peak period.`,
        zoneName: eq.zone.name,
      });
    }
  }

  // Ticketing / demand
  const lowStockTypes = ticketTypes.filter((t) => t.quantity - t.sold <= t.quantity * 0.05 && t.quantity - t.sold > 0);
  for (const tt of lowStockTypes) {
    insights.push({
      id: `ticket-scarcity-${tt.id}`,
      category: 'Vendor Demand Forecast',
      severity: 'info',
      title: `${tt.name} tickets nearly sold out`,
      recommendation: 'Notify vendors near this stand to prepare for higher walk-up demand once the match begins.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      category: 'Operations',
      severity: 'info',
      title: 'All systems nominal',
      recommendation: 'No elevated risk conditions detected. Continue standard monitoring.',
    });
  }

  const severityRank: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 20);
}
