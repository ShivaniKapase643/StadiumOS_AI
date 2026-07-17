import { z } from 'zod';
import { ZoneType, ZoneStatus } from '@prisma/client';

export const createZoneSchema = z.object({
  body: z.object({
    stadiumId: z.string().uuid(),
    name: z.string().min(2).max(100),
    type: z.nativeEnum(ZoneType),
    x: z.number(),
    y: z.number(),
    capacity: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateZoneStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ZoneStatus),
  }),
});
