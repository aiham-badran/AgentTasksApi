import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import { requestId } from './middleware/requestId.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp(): Express {
  const app = express();

  // ─── Security ─────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: '*', // M7: restrict to allowlist
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
  // M2: app.use('/api/v1/auth', authRouter);
  // M3: app.use('/api/v1/tasks', tasksRouter);
  // M4: app.use('/api/v1/settings/ai-keys', aiKeysRouter);
  // M5: app.use('/api/v1/tasks/nl', nlTasksRouter);
  // M6: app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ─── 404 + Errors ─────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
