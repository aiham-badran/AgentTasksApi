// src/middleware/validate.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, target: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (target === 'body') req.body = schema.parse(req.body);
      else _res.locals.validatedQuery = schema.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}
