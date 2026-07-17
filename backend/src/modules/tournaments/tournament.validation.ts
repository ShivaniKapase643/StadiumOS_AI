import { z } from 'zod';
import { MatchStatus } from '@prisma/client';

export const createTournamentSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    sport: z.string().min(2).max(50),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    stadiumId: z.string().uuid().optional(),
  }),
});

export const createTeamSchema = z.object({
  body: z.object({
    tournamentId: z.string().uuid(),
    name: z.string().min(1).max(100),
    shortName: z.string().max(10).optional(),
    group: z.string().max(20).optional(),
  }),
});

export const createPlayerSchema = z.object({
  body: z.object({
    teamId: z.string().uuid(),
    name: z.string().min(1).max(100),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
    position: z.string().max(30).optional(),
    nationality: z.string().max(56).optional(),
  }),
});

export const createRefereeSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    certificationLevel: z.string().max(50).optional(),
  }),
});

export const generateScheduleSchema = z.object({
  body: z.object({
    tournamentId: z.string().uuid(),
    startDate: z.coerce.date(),
    daysBetweenRounds: z.number().int().min(1).max(30).default(7),
    matchTimeUtc: z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
    zoneIds: z.array(z.string().uuid()).optional(),
    refereeIds: z.array(z.string().uuid()).optional(),
  }),
});

export const updateScoreSchema = z.object({
  body: z.object({
    homeScore: z.number().int().min(0),
    awayScore: z.number().int().min(0),
    status: z.nativeEnum(MatchStatus),
  }),
});
