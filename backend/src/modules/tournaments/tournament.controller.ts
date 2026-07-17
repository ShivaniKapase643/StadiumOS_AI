import { Request, Response } from 'express';
import * as tournamentService from './tournament.service';
import { created, ok } from '../../utils/apiResponse';
import { logAudit } from '../users/audit.service';

export async function listTournamentsHandler(_req: Request, res: Response) {
  ok(res, await tournamentService.listTournaments());
}

export async function createTournamentHandler(req: Request, res: Response) {
  const tournament = await tournamentService.createTournament(req.body);
  await logAudit(req.user?.sub, 'CREATE_TOURNAMENT', 'Tournament', tournament.id);
  created(res, tournament);
}

export async function getTournamentHandler(req: Request, res: Response) {
  ok(res, await tournamentService.getTournament(req.params.id));
}

export async function createTeamHandler(req: Request, res: Response) {
  const team = await tournamentService.createTeam(req.body);
  await logAudit(req.user?.sub, 'CREATE_TEAM', 'Team', team.id);
  created(res, team);
}

export async function createPlayerHandler(req: Request, res: Response) {
  const player = await tournamentService.createPlayer(req.body);
  created(res, player);
}

export async function createRefereeHandler(req: Request, res: Response) {
  const referee = await tournamentService.createReferee(req.body);
  created(res, referee);
}

export async function listRefereesHandler(_req: Request, res: Response) {
  ok(res, await tournamentService.listReferees());
}

export async function generateScheduleHandler(req: Request, res: Response) {
  const result = await tournamentService.generateSchedule(req.body);
  await logAudit(req.user?.sub, 'GENERATE_SCHEDULE', 'Tournament', req.body.tournamentId);
  created(res, result);
}

export async function updateMatchScoreHandler(req: Request, res: Response) {
  const match = await tournamentService.updateMatchScore(req.params.fixtureId, req.body);
  await logAudit(req.user?.sub, 'UPDATE_MATCH_SCORE', 'Match', match.id, req.body);
  ok(res, match);
}

export async function leaderboardHandler(req: Request, res: Response) {
  ok(res, await tournamentService.getLeaderboard(req.params.tournamentId));
}
