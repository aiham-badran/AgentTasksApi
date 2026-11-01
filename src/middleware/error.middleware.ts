import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'node:crypto';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) ?? `req_${randomUUID()}`;

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed.',
        details: err.flatten().fieldErrors,
        hint: 'Check the request body and try again.',
        request_id: requestId,
        retryable: false,
      },
    });
    return;
  }

  // App errors
  if (err instanceof AppError) {
    logger.warn({ code: err.code, path: req.path, requestId }, err.message);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.hint && { hint: err.hint }),
        ...(err.suggestedAction && { suggested_action: err.suggestedAction }),
        request_id: requestId,
        retryable: err.retryable,
      },
    });
    return;
  }

  // Unexpected
  logger.error({ err, path: req.path, requestId }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      hint: 'Please retry later or contact support.',
      request_id: requestId,
      retryable: true,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
      hint: 'Check the API documentation at /docs',
      retryable: false,
    },
  });
}
