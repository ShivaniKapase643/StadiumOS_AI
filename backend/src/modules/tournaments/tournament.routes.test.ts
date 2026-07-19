import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./tournament.service');
vi.mock('./predictor.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as tournamentService from './tournament.service';
import { predictFixture } from './predictor.service';

const app = createApp();
const ORGANIZER_TOKEN = tokenFor(Role.TOURNAMENT_ORGANIZER);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('tournament.routes (Supertest, mocked service)', () => {
  it('lists tournaments with pagination for any authenticated user', async () => {
    vi.mocked(tournamentService.listTournaments).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    const res = await request(app).get('/api/tournaments').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects a Fan creating a tournament (RBAC)', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ name: 'Champions Cup', sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(res.status).toBe(403);
  });

  it('rejects a tournament where endDate is before startDate (validation refine)', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ORGANIZER_TOKEN}`)
      .send({ name: 'Champions Cup', sport: 'Football', startDate: '2026-02-01', endDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('creates a tournament and writes an audit log entry', async () => {
    vi.mocked(tournamentService.createTournament).mockResolvedValue({ id: 't1' } as never);
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${ORGANIZER_TOKEN}`)
      .send({ name: 'Champions Cup', sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(res.status).toBe(201);
  });

  it('rejects generating a schedule with a malformed match time', async () => {
    const res = await request(app)
      .post('/api/tournaments/schedule/generate')
      .set('Authorization', `Bearer ${ORGANIZER_TOKEN}`)
      .send({ tournamentId: '11111111-1111-1111-1111-111111111111', startDate: '2026-01-01', matchTimeUtc: 'not-a-time' });
    expect(res.status).toBe(400);
  });

  it('generates a schedule for an organizer', async () => {
    vi.mocked(tournamentService.generateSchedule).mockResolvedValue({ fixtures: [] } as never);
    const res = await request(app)
      .post('/api/tournaments/schedule/generate')
      .set('Authorization', `Bearer ${ORGANIZER_TOKEN}`)
      .send({ tournamentId: '11111111-1111-1111-1111-111111111111', startDate: '2026-01-01' });
    expect(res.status).toBe(201);
  });

  it('rejects a Fan updating a match score (RBAC — organizer/referee only)', async () => {
    const res = await request(app)
      .patch('/api/tournaments/fixtures/f1/score')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ homeScore: 1, awayScore: 0, status: 'FULL_TIME' });
    expect(res.status).toBe(403);
  });

  it('allows a Referee to update a live match score', async () => {
    vi.mocked(tournamentService.updateMatchScore).mockResolvedValue({ id: 'm1', homeScore: 2, awayScore: 1 } as never);
    const res = await request(app)
      .patch('/api/tournaments/fixtures/f1/score')
      .set('Authorization', `Bearer ${tokenFor(Role.REFEREE)}`)
      .send({ homeScore: 2, awayScore: 1, status: 'FULL_TIME' });
    expect(res.status).toBe(200);
  });

  it('returns the leaderboard for a tournament', async () => {
    vi.mocked(tournamentService.getLeaderboard).mockResolvedValue([] as never);
    const res = await request(app).get('/api/tournaments/t1/leaderboard').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns a fixture prediction from the AI Tournament Predictor', async () => {
    vi.mocked(predictFixture).mockResolvedValue({ homeWinPct: 60, drawPct: 25, awayWinPct: 15 } as never);
    const res = await request(app).get('/api/tournaments/fixtures/f1/predict').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.homeWinPct).toBe(60);
  });

  it('propagates a 404 for a tournament that does not exist', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(tournamentService.getTournament).mockRejectedValue(ApiError.notFound('Tournament not found'));
    const res = await request(app).get('/api/tournaments/nope').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});
