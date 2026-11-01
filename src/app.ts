// src/app.ts
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { apiV1Router, healthRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // ─── Security ─────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );

  // ─── Parsing ──────────────────────────────
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Observability ────────────────────────
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // ─── Rate Limiting ────────────────────────
  app.use(generalLimiter);

  // ─── Routes ───────────────────────────────
  app.use(healthRouter);
  app.use('/api/v1', apiV1Router);

  // ─── 404 + Errors ─────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
