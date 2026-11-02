import { z } from 'zod';

/**
 * Strict schema the LLM must produce. Kept minimal and flat so
 * structured-output modes (Groq strict, Gemini responseSchema) accept it.
 */
export const taskDraftSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().datetime().nullable(),
  confidence: z.number().min(0).max(1),
});

export type TaskDraftParsed = z.infer<typeof taskDraftSchema>;
