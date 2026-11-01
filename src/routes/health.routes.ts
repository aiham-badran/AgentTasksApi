import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-tasks-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

healthRouter.get('/api/v1/health', (_req, res) => {
  // M1: will add DB ping here
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
