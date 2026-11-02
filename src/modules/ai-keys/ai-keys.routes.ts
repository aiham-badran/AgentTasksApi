// src/modules/ai-keys/ai-keys.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createController,
  listController,
  deleteController,
  validateController,
} from './ai-keys.controller.js';
import { createAiKeySchema, providerParamSchema } from './ai-keys.schemas.js';

export const aiKeysRouter = Router();

aiKeysRouter.use(requireAuth);

aiKeysRouter.post('/', validate(createAiKeySchema), createController);
aiKeysRouter.get('/', listController);
aiKeysRouter.delete('/:provider', validate(providerParamSchema, 'params'), deleteController);
aiKeysRouter.post(
  '/:provider/validate',
  validate(providerParamSchema, 'params'),
  validateController,
);
