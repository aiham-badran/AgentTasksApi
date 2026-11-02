// src/modules/ai-keys/ai-keys.schemas.ts
import { z } from 'zod';
import { PROVIDER_IDS } from '../../providers/registry.js';

export const createAiKeySchema = z.object({
  provider: z.enum(PROVIDER_IDS, {
    errorMap: () => ({
      message: `provider must be one of: ${PROVIDER_IDS.join(', ')}`,
    }),
  }),
  api_key: z.string().min(8, 'api_key is too short').max(500, 'api_key is too long').trim(),
});

export const providerParamSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
});

export type CreateAiKeyInput = z.infer<typeof createAiKeySchema>;
