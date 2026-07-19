import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    payment: { findMany: vi.fn() },
    stadiumZone: { findMany: vi.fn() },
    sOSAlert: { findMany: vi.fn() },
    equipment: { findMany: vi.fn() },
    incident: { count: vi.fn() },
    parkingLot: { findMany: vi.fn() },
    weatherSnapshot: { findFirst: vi.fn() },
  },
}));
vi.mock('../dashboard/healthScore.service', () => ({ getStadiumHealthScore: vi.fn() }));

import { prisma } from '../../config/db';
import { getStadiumHealthScore } from '../dashboard/healthScore.service';
import { answerChatbotQuery } from './chatbot.service';

describe('answerChatbotQuery (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('describes whether revenue increased or decreased day-over-day', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      { amount: 500, createdAt: new Date('2026-01-02T10:00:00Z') },
      { amount: 300, createdAt: new Date('2026-01-01T10:00:00Z') },
    ] as never);

    const reply = await answerChatbotQuery('why did revenue decrease');
    expect(reply).toContain('increased'); // 500 > 300, so it actually increased — tests the real comparison, not the question's assumption
    expect(reply).toContain('$500.00');
  });

  it('identifies the busiest gate from live crowd readings', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([
      { name: 'Gate A', crowdReadings: [{ capacityPct: 40 }] },
      { name: 'Gate B', crowdReadings: [{ capacityPct: 85 }] },
    ] as never);

    const reply = await answerChatbotQuery('which gate is busiest?');
    expect(reply).toContain('Gate B');
    expect(reply).toContain('85%');
  });

  it('reports no active emergencies when there are none', async () => {
    vi.mocked(prisma.sOSAlert.findMany).mockResolvedValue([]);
    const reply = await answerChatbotQuery('show all emergencies');
    expect(reply).toBe('There are no active emergencies right now.');
  });

  it('lists active emergencies with type and zone when present', async () => {
    vi.mocked(prisma.sOSAlert.findMany).mockResolvedValue([{ type: 'MEDICAL', status: 'OPEN', zone: { name: 'Gate C' } }] as never);
    const reply = await answerChatbotQuery('active emergencies please');
    expect(reply).toContain('MEDICAL');
    expect(reply).toContain('Gate C');
  });

  it('summarizes the aggregate health score', async () => {
    vi.mocked(getStadiumHealthScore).mockResolvedValue({
      overall: 88,
      overallStatus: 'yellow',
      categories: {
        security: { score: 90 }, crowd: { score: 85 }, parking: { score: 80 },
        medical: { score: 95 }, energy: { score: 88 }, maintenance: { score: 92 },
      },
      aiRecommendationCount: 3,
    } as never);

    const reply = await answerChatbotQuery('how is the stadium performance');
    expect(reply).toContain('88%');
    expect(reply).toContain('3 AI recommendation');
  });

  it('falls back to a helpful default for an unrecognized question', async () => {
    const reply = await answerChatbotQuery('what is the meaning of life');
    expect(reply).toContain("not sure");
  });

  it('still answers the original fan-facing gate question', async () => {
    vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([{ name: 'Gate A' }, { name: 'Gate B' }] as never);
    const reply = await answerChatbotQuery('where are the entrances?');
    expect(reply).toContain('Gate A');
  });
});
