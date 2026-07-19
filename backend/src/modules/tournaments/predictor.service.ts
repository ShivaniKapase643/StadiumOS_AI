import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';

export interface MatchPrediction {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  isActual: boolean; // true once the fixture is COMPLETED — see note below
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  actualHomeGoals?: number;
  actualAwayGoals?: number;
  confidencePct: number;
  basis: string;
}

interface TeamForm {
  pointsPerGame: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  played: number;
}

function formFor(entry: { played: number; points: number; goalsFor: number; goalsAgainst: number } | null): TeamForm | null {
  if (!entry || entry.played === 0) return null;
  return {
    pointsPerGame: entry.points / entry.played,
    avgGoalsFor: entry.goalsFor / entry.played,
    avgGoalsAgainst: entry.goalsAgainst / entry.played,
    played: entry.played,
  };
}

const HOME_ADVANTAGE_POINTS = 0.3;

/**
 * Predicts a fixture's outcome from the two teams' real LeaderboardEntry
 * standings in this tournament (points/game, goals for/against) via a
 * logistic win-probability model with a small home-advantage term — no
 * external model, same "simulated AI, rule-based" pattern as the rest of
 * this platform's AI features. Once a fixture is COMPLETED, this returns
 * the actual result instead of re-predicting: the team standings by then
 * already include this match's own result, so "predicting" it retroactively
 * would be circular, not a genuine pre-match forecast.
 */
export async function predictFixture(fixtureId: string): Promise<MatchPrediction> {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: { homeTeam: true, awayTeam: true, match: true },
  });
  if (!fixture) throw ApiError.notFound('Fixture not found');

  if (fixture.status === 'COMPLETED' && fixture.match) {
    return {
      fixtureId,
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      isActual: true,
      homeWinPct: fixture.match.homeScore > fixture.match.awayScore ? 100 : 0,
      drawPct: fixture.match.homeScore === fixture.match.awayScore ? 100 : 0,
      awayWinPct: fixture.match.awayScore > fixture.match.homeScore ? 100 : 0,
      expectedHomeGoals: fixture.match.homeScore,
      expectedAwayGoals: fixture.match.awayScore,
      actualHomeGoals: fixture.match.homeScore,
      actualAwayGoals: fixture.match.awayScore,
      confidencePct: 100,
      basis: 'Match completed — showing the actual result.',
    };
  }

  const [homeEntry, awayEntry] = await Promise.all([
    prisma.leaderboardEntry.findUnique({ where: { teamId: fixture.homeTeamId } }),
    prisma.leaderboardEntry.findUnique({ where: { teamId: fixture.awayTeamId } }),
  ]);

  const homeForm = formFor(homeEntry);
  const awayForm = formFor(awayEntry);

  if (!homeForm || !awayForm) {
    return {
      fixtureId,
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      isActual: false,
      homeWinPct: 40,
      drawPct: 25,
      awayWinPct: 35,
      expectedHomeGoals: 1,
      expectedAwayGoals: 1,
      confidencePct: 30,
      basis: 'Not enough completed matches yet for one or both teams — showing a baseline estimate with home-ground advantage only.',
    };
  }

  const strengthDiff = homeForm.pointsPerGame + HOME_ADVANTAGE_POINTS - awayForm.pointsPerGame;
  const homeWinRaw = 1 / (1 + Math.exp(-strengthDiff)); // logistic curve, 0..1
  const drawPctRaw = Math.max(0.12, 0.3 - Math.abs(strengthDiff) * 0.05); // closer teams draw more often

  const homeWinPct = Math.round(homeWinRaw * (1 - drawPctRaw) * 100);
  const awayWinPct = Math.round((1 - homeWinRaw) * (1 - drawPctRaw) * 100);
  const drawPct = Math.max(0, 100 - homeWinPct - awayWinPct); // guarantees the three sum to exactly 100

  return {
    fixtureId,
    homeTeam: fixture.homeTeam.name,
    awayTeam: fixture.awayTeam.name,
    isActual: false,
    homeWinPct,
    drawPct,
    awayWinPct,
    expectedHomeGoals: Math.round(((homeForm.avgGoalsFor + awayForm.avgGoalsAgainst) / 2) * 10) / 10,
    expectedAwayGoals: Math.round(((awayForm.avgGoalsFor + homeForm.avgGoalsAgainst) / 2) * 10) / 10,
    confidencePct: Math.min(92, 40 + Math.min(homeForm.played, awayForm.played) * 6),
    basis: `Based on ${homeForm.played} completed matches for ${fixture.homeTeam.name} and ${awayForm.played} for ${fixture.awayTeam.name} this tournament.`,
  };
}
