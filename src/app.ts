// src/app.ts
import express, { type Express } from 'express';
import { globalStack, notFoundHandler, errorHandler } from './middleware/index.js';
import { apiV1Router, healthRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // ─── Global Middleware (security, parsing, observability, rate limit) ──
  app.use(globalStack);

  // ─── Routes ───────────────────────────────
  app.use(healthRouter); // /health (root, for load balancer)
  app.use('/api/v1', apiV1Router); // كل الـ API هنا

  // ─── 404 + Error handling (must be last) ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
