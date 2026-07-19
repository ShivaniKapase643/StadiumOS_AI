import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiResponse';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowed.includes(req.user.role)) {
      throw ApiError.forbidden(`Role ${req.user.role} is not permitted to perform this action`);
    }
    next();
  };
}

/**
 * The two org-admin roles that appear as a prefix in nearly every
 * per-module role list (e.g. `[...ADMIN_ROLES, Role.SECURITY_OFFICER]`) —
 * shared here so "who counts as an admin" has one source of truth instead
 * of being repeated as a literal pair across eight route files.
 */
export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN];

export const ALL_STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.STADIUM_ADMIN,
  Role.TOURNAMENT_ORGANIZER,
  Role.SECURITY_OFFICER,
  Role.MEDICAL_TEAM,
  Role.MAINTENANCE_TEAM,
  Role.VENDOR,
  Role.VOLUNTEER,
  Role.REFEREE,
];
