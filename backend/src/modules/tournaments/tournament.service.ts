import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { MatchStatus, FixtureStatus } from '@prisma/client';
import { emitToAll } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

// ---------------------------------------------------------------------------
// Tournaments / Teams / Players / Referees — CRUD
// ---------------------------------------------------------------------------

export async function listTournaments(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.tournament.findMany({
      include: { teams: true, stadium: true, _count: { select: { fixtures: true } } },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tournament.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function createTournament(input: {
  name: string;
  sport: string;
  startDate: Date;
  endDate: Date;
  stadiumId?: string;
}) {
  return prisma.tournament.create({ data: input });
}

export async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { include: { players: true } },
      fixtures: { include: { homeTeam: true, awayTeam: true, referee: { include: { user: true } }, zone: true, match: true }, orderBy: { scheduledAt: 'asc' } },
      standings: { include: { team: true }, orderBy: { points: 'desc' } },
    },
  });
  if (!tournament) throw ApiError.notFound('Tournament not found');
  return tournament;
}

export async function createTeam(input: { tournamentId: string; name: string; shortName?: string; group?: string }) {
  const team = await prisma.team.create({ data: input });
  await prisma.leaderboardEntry.create({
    data: { tournamentId: input.tournamentId, teamId: team.id },
  });
  return team;
}

export async function createPlayer(input: {
  teamId: string;
  name: string;
  jerseyNumber?: number;
  position?: string;
  nationality?: string;
}) {
  return prisma.player.create({ data: input });
}

export async function createReferee(input: { userId: string; certificationLevel?: string }) {
  return prisma.referee.create({ data: input });
}

export async function listReferees() {
  return prisma.referee.findMany({ include: { user: true } });
}

// ---------------------------------------------------------------------------
// Schedule Generator — round-robin (circle method) with ground + referee
// auto-allocation.
// ---------------------------------------------------------------------------

export function generateRoundRobinPairs(teamIds: string[]): Array<Array<[string, string]>> {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push('__BYE__');

  const numRounds = teams.length - 1;
  const half = teams.length / 2;
  const rounds: Array<Array<[string, string]>> = [];

  let rotation = [...teams];
  for (let round = 0; round < numRounds; round++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== '__BYE__' && away !== '__BYE__') {
        pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    rounds.push(pairs);
    // Rotate all but the first element
    rotation = [rotation[0], ...rotation.slice(-1), ...rotation.slice(1, -1)];
  }

  return rounds;
}

export async function generateSchedule(input: {
  tournamentId: string;
  startDate: Date;
  daysBetweenRounds: number;
  matchTimeUtc: string;
  zoneIds?: string[];
  refereeIds?: string[];
}) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    include: { teams: true },
  });
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (tournament.teams.length < 2) throw ApiError.badRequest('Need at least 2 teams to generate a schedule');

  const existingFixtures = await prisma.fixture.count({ where: { tournamentId: input.tournamentId } });
  if (existingFixtures > 0) {
    throw ApiError.conflict('Fixtures already exist for this tournament. Delete them before regenerating.');
  }

  const rounds = generateRoundRobinPairs(tournament.teams.map((t) => t.id));
  const [hh, mm] = input.matchTimeUtc.split(':').map(Number);

  const fixturesToCreate: Array<{
    tournamentId: string;
    round: string;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
    zoneId?: string;
    refereeId?: string;
  }> = [];

  let refereeCursor = 0;
  let zoneCursor = 0;

  rounds.forEach((pairs, roundIndex) => {
    const roundDate = new Date(input.startDate);
    roundDate.setDate(roundDate.getDate() + roundIndex * input.daysBetweenRounds);
    roundDate.setUTCHours(hh, mm, 0, 0);

    pairs.forEach(([homeTeamId, awayTeamId]) => {
      const zoneId = input.zoneIds?.length ? input.zoneIds[zoneCursor % input.zoneIds.length] : undefined;
      const refereeId = input.refereeIds?.length ? input.refereeIds[refereeCursor % input.refereeIds.length] : undefined;
      zoneCursor++;
      refereeCursor++;

      fixturesToCreate.push({
        tournamentId: input.tournamentId,
        round: `Round ${roundIndex + 1}`,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(roundDate),
        zoneId,
        refereeId,
      });
    });
  });

  await prisma.$transaction(
    fixturesToCreate.map((f) =>
      prisma.fixture.create({
        data: f,
      })
    )
  );

  return getTournament(input.tournamentId);
}

// ---------------------------------------------------------------------------
// Live scoring + leaderboard recompute
// ---------------------------------------------------------------------------

export async function updateMatchScore(
  fixtureId: string,
  input: { homeScore: number; awayScore: number; status: MatchStatus }
) {
  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId }, include: { match: true } });
  if (!fixture) throw ApiError.notFound('Fixture not found');

  const match = fixture.match
    ? await prisma.match.update({
        where: { id: fixture.match.id },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          status: input.status,
          startedAt: fixture.match.startedAt ?? new Date(),
          endedAt: input.status === MatchStatus.FULL_TIME ? new Date() : null,
        },
      })
    : await prisma.match.create({
        data: {
          fixtureId,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          status: input.status,
          startedAt: new Date(),
        },
      });

  await prisma.fixture.update({
    where: { id: fixtureId },
    data: {
      status: input.status === MatchStatus.FULL_TIME ? FixtureStatus.COMPLETED : FixtureStatus.LIVE,
    },
  });

  if (input.status === MatchStatus.FULL_TIME) {
    await recomputeLeaderboard(fixture.tournamentId);
  }

  emitToAll(SOCKET_EVENTS.MATCH_SCORE_UPDATE, {
    fixtureId,
    matchId: match.id,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  });

  return match;
}

const MATCH_PROGRESSION: MatchStatus[] = [
  MatchStatus.NOT_STARTED,
  MatchStatus.FIRST_HALF,
  MatchStatus.HALFTIME,
  MatchStatus.SECOND_HALF,
  MatchStatus.FULL_TIME,
];

/**
 * Auto-advances one in-progress (or next-up) fixture's score/status so the
 * Live Demo has a match feed that moves on its own, without requiring a
 * referee to manually click through score updates during a demo.
 */
export async function demoTickMatchSimulation() {
  let fixture = await prisma.fixture.findFirst({
    where: { status: FixtureStatus.LIVE },
    include: { match: true },
    orderBy: { scheduledAt: 'asc' },
  });

  if (!fixture) {
    fixture = await prisma.fixture.findFirst({
      where: { status: FixtureStatus.SCHEDULED },
      include: { match: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }
  if (!fixture) return null;

  const currentStatus = fixture.match?.status ?? MatchStatus.NOT_STARTED;
  const currentIndex = MATCH_PROGRESSION.indexOf(currentStatus);
  const nextStatus = MATCH_PROGRESSION[Math.min(currentIndex + 1, MATCH_PROGRESSION.length - 1)];

  const scoringHalf = nextStatus === MatchStatus.FIRST_HALF || nextStatus === MatchStatus.SECOND_HALF;
  const homeScore = (fixture.match?.homeScore ?? 0) + (scoringHalf && Math.random() < 0.35 ? 1 : 0);
  const awayScore = (fixture.match?.awayScore ?? 0) + (scoringHalf && Math.random() < 0.3 ? 1 : 0);

  return updateMatchScore(fixture.id, { homeScore, awayScore, status: nextStatus });
}

export async function recomputeLeaderboard(tournamentId: string) {
  const fixtures = await prisma.fixture.findMany({
    where: { tournamentId, status: FixtureStatus.COMPLETED },
    include: { match: true },
  });

  const stats = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }
  >();

  const ensure = (teamId: string) => {
    if (!stats.has(teamId)) {
      stats.set(teamId, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    }
    return stats.get(teamId)!;
  };

  for (const fixture of fixtures) {
    if (!fixture.match) continue;
    const home = ensure(fixture.homeTeamId);
    const away = ensure(fixture.awayTeamId);
    const { homeScore, awayScore } = fixture.match;

    home.played++;
    away.played++;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (homeScore < awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  await prisma.$transaction(
    Array.from(stats.entries()).map(([teamId, s]) =>
      prisma.leaderboardEntry.upsert({
        where: { teamId },
        create: { tournamentId, teamId, ...s },
        update: { ...s },
      })
    )
  );
}

export async function getLeaderboard(tournamentId: string) {
  return prisma.leaderboardEntry.findMany({
    where: { tournamentId },
    include: { team: true },
    orderBy: [{ points: 'desc' }, { goalsFor: 'desc' }],
  });
}
