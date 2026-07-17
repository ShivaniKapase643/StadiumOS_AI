import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../config/logger';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ success: false, message: err.message, details: err.details });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A record with this value already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
  }

  logger.error(`Unhandled error on ${req.method} ${req.path}`, { error: err });
  res.status(500).json({ success: false, message: 'Internal server error' });
}
