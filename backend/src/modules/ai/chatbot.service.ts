import { prisma } from '../../config/db';
import { IncidentStatus, SOSStatus } from '@prisma/client';
import { getStadiumHealthScore } from '../dashboard/healthScore.service';

/**
 * Rule-based keyword-matching FAQ chatbot backed by live stadium data —
 * intentionally not an LLM call (this platform's AI features are simulated).
 * The AI Copilot's operator-facing intents (revenue, busiest gate, open
 * emergencies, maintenance, performance) are checked before the original
 * fan-facing ones below so a more specific phrase like "which gate is
 * busiest" doesn't fall through to the generic gate-listing branch.
 */
export async function answerChatbotQuery(message: string): Promise<string> {
  const text = message.toLowerCase();

  if (/revenue/.test(text)) {
    const payments = await prisma.payment.findMany({ where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 500 });
    const byDay = new Map<string, number>();
    for (const p of payments) {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(p.amount));
    }
    const days = Array.from(byDay.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // newest first
    if (days.length < 2) {
      const total = days.reduce((s, [, amt]) => s + amt, 0);
      return `Total revenue collected so far: $${total.toFixed(2)}. There isn't enough day-over-day history yet to describe a trend.`;
    }
    const [today, prior] = days;
    const change = today[1] - prior[1];
    const direction = change >= 0 ? 'increased' : 'decreased';
    return `Revenue on ${today[0]} was $${today[1].toFixed(2)}, which ${direction} by $${Math.abs(change).toFixed(2)} versus ${prior[0]} ($${prior[1].toFixed(2)}).`;
  }

  if (/(busiest gate|gate.*busy|which gate)/.test(text)) {
    const gates = await prisma.stadiumZone.findMany({
      where: { type: 'GATE' },
      include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
    const busiest = gates.filter((g) => g.crowdReadings[0]).sort((a, b) => (b.crowdReadings[0]?.capacityPct ?? 0) - (a.crowdReadings[0]?.capacityPct ?? 0))[0];
    if (busiest) {
      return `${busiest.name} is currently the busiest gate at ${busiest.crowdReadings[0].capacityPct.toFixed(0)}% capacity.`;
    }
    return 'No gate crowd data is available yet.';
  }

  if (/(all emergenc|show emergenc|active emergenc)/.test(text)) {
    const alerts = await prisma.sOSAlert.findMany({
      where: { status: { in: [SOSStatus.OPEN, SOSStatus.DISPATCHED] } },
      include: { zone: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (alerts.length === 0) return 'There are no active emergencies right now.';
    return `${alerts.length} active emergenc${alerts.length === 1 ? 'y' : 'ies'}: ${alerts.map((a) => `${a.type}${a.zone ? ` near ${a.zone.name}` : ''} (${a.status})`).join('; ')}.`;
  }

  if (/(generate.*report|event report|full report)/.test(text)) {
    return 'Head to Reports & Analytics and select "Generate Full Event Report" to download a consolidated PDF covering attendance, revenue, crowd, security, parking, and AI insights.';
  }

  if (/(need.*maintenance|maintenance.*need|which.*maintenance)/.test(text)) {
    const equipment = await prisma.equipment.findMany({ where: { status: { in: ['CRITICAL', 'OFFLINE', 'WARNING'] } }, include: { zone: true } });
    if (equipment.length === 0) return 'No equipment currently needs maintenance attention.';
    return `${equipment.length} item(s) need attention: ${equipment.map((e) => `${e.name} in ${e.zone.name} (${e.status.toLowerCase()})`).join('; ')}.`;
  }

  if (/(stadium performance|health score|how is the stadium)/.test(text)) {
    const health = await getStadiumHealthScore();
    return `Overall stadium health is ${health.overall}% (${health.overallStatus}). Security ${health.categories.security.score}%, crowd ${health.categories.crowd.score}%, parking ${health.categories.parking.score}%, medical ${health.categories.medical.score}%, energy ${health.categories.energy.score}%, maintenance ${health.categories.maintenance.score}%. ${health.aiRecommendationCount} AI recommendation(s) active.`;
  }

  if (/(open incident|security incident)/.test(text)) {
    const count = await prisma.incident.count({ where: { status: { in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] } } });
    return count === 0 ? 'No open security incidents.' : `There are ${count} open security incident(s) — see the Security Center for details.`;
  }

  if (/(gate|entrance|entry)/.test(text)) {
    const gates = await prisma.stadiumZone.findMany({ where: { type: 'GATE' }, take: 4 });
    return `The stadium has ${gates.length} main gates: ${gates.map((g) => g.name).join(', ')}. Your ticket's seat section determines the nearest recommended gate.`;
  }

  if (/(park|parking)/.test(text)) {
    const lots = await prisma.parkingLot.findMany({ include: { slots: true } });
    const summary = lots
      .map((lot) => {
        const occupied = lot.slots.filter((s) => s.status === 'OCCUPIED').length;
        return `${lot.name}: ${occupied}/${lot.slots.length} occupied`;
      })
      .join('; ');
    return `Current parking availability — ${summary || 'no parking data yet'}.`;
  }

  if (/(crowd|busy|congest)/.test(text)) {
    const zones = await prisma.stadiumZone.findMany({
      include: { crowdReadings: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
    const busiest = zones
      .filter((z) => z.crowdReadings[0])
      .sort((a, b) => (b.crowdReadings[0]?.capacityPct ?? 0) - (a.crowdReadings[0]?.capacityPct ?? 0))[0];
    if (busiest) {
      return `Right now, ${busiest.name} is the busiest area at ${busiest.crowdReadings[0].capacityPct.toFixed(0)}% capacity. Consider other zones if you'd like to avoid crowds.`;
    }
    return 'Crowd data is still being collected — please check back shortly.';
  }

  if (/(food|eat|restaurant|court)/.test(text)) {
    const courts = await prisma.stadiumZone.findMany({ where: { type: 'FOOD_COURT' } });
    return `There are ${courts.length} food courts: ${courts.map((c) => c.name).join(', ')}. You can order ahead from the Fan Experience section.`;
  }

  if (/(washroom|toilet|restroom|bathroom)/.test(text)) {
    const washrooms = await prisma.stadiumZone.findMany({ where: { type: 'WASHROOM' } });
    return `The nearest washrooms are: ${washrooms.map((w) => w.name).join(', ')}.`;
  }

  if (/(medical|doctor|first aid|injur)/.test(text)) {
    const medical = await prisma.stadiumZone.findMany({ where: { type: 'MEDICAL' } });
    return `Medical assistance is available at: ${medical.map((m) => m.name).join(', ')}. In an emergency, use the SOS button in the app.`;
  }

  if (/(lost|found|missing item)/.test(text)) {
    return "You can report a lost item or browse found items in the Fan Experience → Lost & Found section.";
  }

  if (/(ticket|seat|refund)/.test(text)) {
    return 'You can manage your tickets, including refunds, from the "My Tickets" page.';
  }

  if (/(weather|rain|hot|storm)/.test(text)) {
    const weather = await prisma.weatherSnapshot.findFirst({ orderBy: { recordedAt: 'desc' } });
    if (weather) {
      return `Current conditions: ${weather.temperatureC}°C and ${weather.condition.toLowerCase()}, wind ${weather.windSpeedKmh} km/h.`;
    }
    return 'Weather data is not available right now.';
  }

  if (/(hello|hi|hey)/.test(text)) {
    return 'Hi! I can help with gates, parking, crowd levels, food courts, washrooms, medical rooms, lost & found, and tickets. What do you need?';
  }

  return "I'm not sure about that yet — try asking about gates, parking, crowd levels, food courts, washrooms, medical rooms, or your tickets.";
}
