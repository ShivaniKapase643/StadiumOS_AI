import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    fixture: { findUnique: vi.fn() },
    leaderboardEntry: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../../config/db';
import { predictFixture } from './predictor.service';

const BASE_FIXTURE = {
  id: 'fx1',
  homeTeamId: 'home',
  awayTeamId: 'away',
  status: 'SCHEDULED',
  homeTeam: { name: 'Metro Lions' },
  awayTeam: { name: 'Summit Bears' },
  match: null,
};

describe('predictFixture (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 for a non-existent fixture', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(null);
    await expect(predictFixture('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('returns the actual result for a COMPLETED fixture instead of a prediction', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue({
      ...BASE_FIXTURE,
      status: 'COMPLETED',
      match: { homeScore: 3, awayScore: 1 },
    } as never);

    const result = await predictFixture('fx1');
    expect(result.isActual).toBe(true);
    expect(result.actualHomeGoals).toBe(3);
    expect(result.homeWinPct).toBe(100);
    expect(prisma.leaderboardEntry.findUnique).not.toHaveBeenCalled(); // never re-derives from standings
  });

  it('falls back to a low-confidence baseline when a team has no completed matches yet', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(BASE_FIXTURE as never);
    vi.mocked(prisma.leaderboardEntry.findUnique).mockResolvedValueOnce(null).mockResolvedValueOnce({ played: 3, points: 6, goalsFor: 5, goalsAgainst: 3 } as never);

    const result = await predictFixture('fx1');
    expect(result.confidencePct).toBe(30);
    expect(result.isActual).toBe(false);
  });

  it('favors the team with the stronger points-per-game record', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(BASE_FIXTURE as never);
    vi.mocked(prisma.leaderboardEntry.findUnique)
      .mockResolvedValueOnce({ played: 5, points: 15, goalsFor: 12, goalsAgainst: 2 } as never) // home: dominant
      .mockResolvedValueOnce({ played: 5, points: 3, goalsFor: 3, goalsAgainst: 10 } as never); // away: struggling

    const result = await predictFixture('fx1');
    expect(result.homeWinPct).toBeGreaterThan(result.awayWinPct);
    expect(result.expectedHomeGoals).toBeGreaterThan(result.expectedAwayGoals);
  });

  it('always sums win/draw/loss percentages to exactly 100', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(BASE_FIXTURE as never);
    vi.mocked(prisma.leaderboardEntry.findUnique)
      .mockResolvedValueOnce({ played: 4, points: 8, goalsFor: 6, goalsAgainst: 5 } as never)
      .mockResolvedValueOnce({ played: 4, points: 7, goalsFor: 5, goalsAgainst: 6 } as never);

    const result = await predictFixture('fx1');
    expect(result.homeWinPct + result.drawPct + result.awayWinPct).toBe(100);
  });

  it('raises confidence as both teams accumulate more completed matches', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(BASE_FIXTURE as never);
    vi.mocked(prisma.leaderboardEntry.findUnique)
      .mockResolvedValueOnce({ played: 1, points: 3, goalsFor: 2, goalsAgainst: 0 } as never)
      .mockResolvedValueOnce({ played: 1, points: 0, goalsFor: 0, goalsAgainst: 2 } as never);
    const fewGames = await predictFixture('fx1');

    vi.mocked(prisma.leaderboardEntry.findUnique)
      .mockResolvedValueOnce({ played: 8, points: 20, goalsFor: 18, goalsAgainst: 5 } as never)
      .mockResolvedValueOnce({ played: 8, points: 5, goalsFor: 8, goalsAgainst: 18 } as never);
    const manyGames = await predictFixture('fx1');

    expect(manyGames.confidencePct).toBeGreaterThan(fewGames.confidencePct);
  });
});
