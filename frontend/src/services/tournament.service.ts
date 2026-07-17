import { api } from './api';
import type { Fixture, LeaderboardEntry, MatchStatus, Tournament } from '@/types';

export async function listTournaments() {
  const { data } = await api.get<{ data: Tournament[] }>('/tournaments');
  return data.data;
}

export async function getTournament(id: string) {
  const { data } = await api.get<{ data: Tournament }>(`/tournaments/${id}`);
  return data.data;
}

export async function createTournament(input: { name: string; sport: string; startDate: string; endDate: string; stadiumId?: string }) {
  const { data } = await api.post<{ data: Tournament }>('/tournaments', input);
  return data.data;
}

export async function createTeam(input: { tournamentId: string; name: string; shortName?: string; group?: string }) {
  const { data } = await api.post('/tournaments/teams', input);
  return data.data;
}

export async function createPlayer(input: { teamId: string; name: string; jerseyNumber?: number; position?: string }) {
  const { data } = await api.post('/tournaments/players', input);
  return data.data;
}

export async function listReferees() {
  const { data } = await api.get<{ data: Array<{ id: string; userId: string; user: { name: string }; certificationLevel?: string }> }>(
    '/tournaments/referees'
  );
  return data.data;
}

export async function generateSchedule(input: {
  tournamentId: string;
  startDate: string;
  daysBetweenRounds: number;
  matchTimeUtc: string;
  refereeIds?: string[];
}) {
  const { data } = await api.post<{ data: Tournament }>('/tournaments/schedule/generate', input);
  return data.data;
}

export async function updateMatchScore(fixtureId: string, input: { homeScore: number; awayScore: number; status: MatchStatus }) {
  const { data } = await api.patch(`/tournaments/fixtures/${fixtureId}/score`, input);
  return data.data as Fixture['match'];
}

export async function getLeaderboard(tournamentId: string) {
  const { data } = await api.get<{ data: LeaderboardEntry[] }>(`/tournaments/${tournamentId}/leaderboard`);
  return data.data;
}
