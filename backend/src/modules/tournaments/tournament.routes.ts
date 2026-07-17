import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import {
  createTournamentSchema,
  createTeamSchema,
  createPlayerSchema,
  createRefereeSchema,
  generateScheduleSchema,
  updateScoreSchema,
} from './tournament.validation';
import {
  listTournamentsHandler,
  createTournamentHandler,
  getTournamentHandler,
  createTeamHandler,
  createPlayerHandler,
  createRefereeHandler,
  listRefereesHandler,
  generateScheduleHandler,
  updateMatchScoreHandler,
  leaderboardHandler,
} from './tournament.controller';

const router = Router();
router.use(requireAuth);

const ORGANIZER_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.TOURNAMENT_ORGANIZER];
const SCORING_ROLES = [...ORGANIZER_ROLES, Role.REFEREE];

/**
 * @openapi
 * /tournaments:
 *   get:
 *     summary: "List tournaments"
 *     tags: [Tournaments]
 */
router.get('/', asyncHandler(listTournamentsHandler));

/**
 * @openapi
 * /tournaments:
 *   post:
 *     summary: "Create a tournament"
 *     tags: [Tournaments]
 */
router.post('/', requireRole(...ORGANIZER_ROLES), validate(createTournamentSchema), asyncHandler(createTournamentHandler));

/**
 * @openapi
 * /tournaments/referees:
 *   get:
 *     summary: "List referees"
 *     tags: [Tournaments]
 */
router.get('/referees', asyncHandler(listRefereesHandler));

/**
 * @openapi
 * /tournaments/referees:
 *   post:
 *     summary: "Register a referee profile for a user"
 *     tags: [Tournaments]
 */
router.post('/referees', requireRole(...ORGANIZER_ROLES), validate(createRefereeSchema), asyncHandler(createRefereeHandler));

/**
 * @openapi
 * /tournaments/teams:
 *   post:
 *     summary: "Add a team to a tournament"
 *     tags: [Tournaments]
 */
router.post('/teams', requireRole(...ORGANIZER_ROLES), validate(createTeamSchema), asyncHandler(createTeamHandler));

/**
 * @openapi
 * /tournaments/players:
 *   post:
 *     summary: "Add a player to a team"
 *     tags: [Tournaments]
 */
router.post('/players', requireRole(...ORGANIZER_ROLES), validate(createPlayerSchema), asyncHandler(createPlayerHandler));

/**
 * @openapi
 * /tournaments/schedule/generate:
 *   post:
 *     summary: "Generate a round-robin schedule"
 *     tags: [Tournaments]
 */
router.post(
  '/schedule/generate',
  requireRole(...ORGANIZER_ROLES),
  validate(generateScheduleSchema),
  asyncHandler(generateScheduleHandler)
);

/**
 * @openapi
 * /tournaments/fixtures/{fixtureId}/score:
 *   patch:
 *     summary: "Update live match score"
 *     tags: [Tournaments]
 */
router.patch(
  '/fixtures/:fixtureId/score',
  requireRole(...SCORING_ROLES),
  validate(updateScoreSchema),
  asyncHandler(updateMatchScoreHandler)
);

/**
 * @openapi
 * /tournaments/{tournamentId}/leaderboard:
 *   get:
 *     summary: "Get tournament leaderboard"
 *     tags: [Tournaments]
 */
router.get('/:tournamentId/leaderboard', asyncHandler(leaderboardHandler));

/**
 * @openapi
 * /tournaments/{id}:
 *   get:
 *     summary: "Get a tournament with teams, fixtures, standings"
 *     tags: [Tournaments]
 */
router.get('/:id', asyncHandler(getTournamentHandler));

export default router;
