// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { registerController, loginController, meController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { authLimiter } from '../../middleware/rateLimit.middleware.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), registerController);

authRouter.post('/login', authLimiter, validate(loginSchema), loginController);

authRouter.get('/me', requireAuth, meController);
