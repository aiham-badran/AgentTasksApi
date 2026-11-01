// src/middleware/observability.middleware.ts
import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';
import { requestId } from './requestId.middleware.js';

const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});

export const observabilityStack = [requestId, httpLogger];
