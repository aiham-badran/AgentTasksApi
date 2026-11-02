import { Router } from 'express';
export const healthRouter = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: API health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-tasks-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});
