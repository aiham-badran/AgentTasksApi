// src/middleware/validate.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (target === 'body') req.body = schema.parse(req.body);
      else if (target === 'query') _res.locals.validatedQuery = schema.parse(req.query);
      else _res.locals.validatedParams = schema.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}
