import { z } from 'zod';
import { PROVIDER_IDS } from '../../providers/registry.js';

export const createNlTaskSchema = z.object({
  text: z
    .string()
    .min(1, 'text is required')
    .max(1000, 'text must be at most 1000 characters')
    .trim(),
  provider: z.enum(PROVIDER_IDS).optional(),
  model: z.string().min(1).max(100).optional(),
});

export type CreateNlTaskInput = z.infer<typeof createNlTaskSchema>;
