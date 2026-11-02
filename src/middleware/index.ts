// src/middleware/index.ts
import type { RequestHandler } from 'express';
import { securityStack } from './security.middleware.js';
import { parsingStack } from './parsing.middleware.js';
import { observabilityStack } from './observability.middleware.js';
import { generalLimiter } from './rateLimit.middleware.js';
import {} from './swagger.middleware.js';

// ─── Global stack (يُطبق على كل طلب قبل الـ routes) ──
// لترتيب المهم: security → parsing → observability → rate limiting
export const globalStack: RequestHandler[] = [
  ...securityStack,
  ...parsingStack,
  ...observabilityStack,
  generalLimiter,
];

// ─── Re-exports (تسهيل الاستيراد من app أو routes) ──
export { requireAuth } from './auth.middleware.js';
export { validate } from './validate.middleware.js';
export { authLimiter, generalLimiter } from './rateLimit.middleware.js';
export { errorHandler, notFoundHandler } from './error.middleware.js';
export { swaggerStack, swaggerDocs } from './swagger.middleware.js';
