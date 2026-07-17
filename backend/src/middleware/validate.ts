import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/apiResponse';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw ApiError.badRequest('Validation failed', err.flatten());
      }
      throw err;
    }
  };
}
