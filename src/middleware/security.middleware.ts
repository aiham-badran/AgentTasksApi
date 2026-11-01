// src/middleware/security.middleware.ts
import helmet from 'helmet';
import cors from 'cors';

export const securityStack = [
  helmet(),
  cors({
    origin: '*', // M7: restrict to allowlist
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }),
];
