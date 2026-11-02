// src/routes/index.ts
import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { tasksRouter } from '../modules/tasks/tasks.routes.js';
import { aiKeysRouter } from '../modules/ai-keys/ai-keys.routes.js';

// ─── Root-level routes  ─────────────────
export { healthRouter };

// ─── API v1 Router  ────────────────────
export const apiV1Router = Router();

// Health (API-level, سيتحقق من DB في M1.5)
apiV1Router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ─── Modules                ──────
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/tasks', tasksRouter);
apiV1Router.use('/settings/ai-keys', aiKeysRouter);
