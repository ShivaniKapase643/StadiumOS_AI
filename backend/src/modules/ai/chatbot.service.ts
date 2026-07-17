import { prisma } from '../../config/db';

/**
 * Rule-based keyword-matching FAQ chatbot backed by live stadium data —
 * intentionally not an LLM call (this platform's AI features are simulated).
 */
export async function answerChatbotQuery(message: string): Promise<string> {
  const text = message.toLowerCase();

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
