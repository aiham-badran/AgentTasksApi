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
import { listModelsController } from './ai-keys.controller.js';

export const aiKeysRouter = Router();

aiKeysRouter.use(requireAuth);

/**
 * @swagger
 * /api/v1/settings/ai-keys:
 *   post:
 *     summary: Add or update an AI provider key (BYOK)
 *     description: |
 *       Validates the key against the provider before saving.
 *       The key is encrypted with AES-256-GCM at rest and never returned in full.
 *     tags: [AI Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAiKeyInput'
 *     responses:
 *       201:
 *         description: Key created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiKey'
 *       200:
 *         description: Key updated (upsert)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiKey'
 *       401:
 *         description: Provider rejected the key (AI_KEY_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       429:
 *         description: Provider quota exceeded (AI_QUOTA_EXCEEDED)
 */
aiKeysRouter.post('/', validate(createAiKeySchema), createController);

/**
 * @swagger
 * /api/v1/settings/ai-keys:
 *   get:
 *     summary: List configured AI keys (masked)
 *     tags: [AI Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of masked keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AiKey'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
aiKeysRouter.get('/', listController);

/**
 * @swagger
 * /api/v1/settings/ai-keys/{provider}:
 *   delete:
 *     summary: Delete an AI key
 *     tags: [AI Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [groq, google, openrouter] }
 *     responses:
 *       204:
 *         description: Key deleted
 *       404:
 *         description: Key not found (AI_KEY_NOT_FOUND)
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 */
aiKeysRouter.delete('/:provider', validate(providerParamSchema, 'params'), deleteController);

/**
 * @swagger
 * /api/v1/settings/ai-keys/{provider}/validate:
 *   post:
 *     summary: Re-validate a stored AI key
 *     tags: [AI Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [groq, google, openrouter] }
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid: { type: boolean }
 *                 status: { type: string, enum: [ok, invalid_key, quota_exceeded, provider_error] }
 *                 usage:
 *                   type: object
 *                   properties:
 *                     used: { type: integer, nullable: true }
 *                     limit: { type: integer, nullable: true }
 *       401:
 *         description: Provider rejected the key (AI_KEY_INVALID)
 *       404:
 *         description: Key not found (AI_KEY_NOT_FOUND)
 */
aiKeysRouter.post(
  '/:provider/validate',
  validate(providerParamSchema, 'params'),
  validateController,
);

/**
 * @swagger
 * /api/v1/settings/ai-keys/{provider}/models:
 *   get:
 *     summary: List available models for a provider
 *     tags: [AI Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string, enum: [groq, google, openrouter] }
 *     responses:
 *       200:
 *         description: List of models
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ModelInfo'
 *       401:
 *         description: Provider rejected the stored key (AI_KEY_INVALID)
 *       404:
 *         description: Key not found (AI_KEY_NOT_FOUND)
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 */
aiKeysRouter.get(
  '/:provider/models',
  validate(providerParamSchema, 'params'),
  listModelsController,
);
