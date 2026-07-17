import { z } from 'zod';

export const createTournamentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sport: z.string().min(2, 'Sport is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});
export type CreateTournamentValues = z.infer<typeof createTournamentSchema>;

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  shortName: z.string().max(10).optional(),
  group: z.string().max(20).optional(),
});
export type CreateTeamValues = z.infer<typeof createTeamSchema>;

export const generateScheduleSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  daysBetweenRounds: z.coerce.number().int().min(1).max(30),
  matchTimeUtc: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
});
export type GenerateScheduleValues = z.infer<typeof generateScheduleSchema>;
