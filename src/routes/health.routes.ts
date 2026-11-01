import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
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
  try {
    const result = db.select().from(users).limit(1).all();
    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
