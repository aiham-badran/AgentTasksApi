// src/modules/tasks/tasks.schemas.ts
import { z } from 'zod';

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

const isoDate = z.string().datetime({ message: 'Invalid ISO 8601 date' });

// ─── Create ─────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  due_date: isoDate.nullable().optional(),
});

// ─── Update (partial) ───────────────────────────────
export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    due_date: isoDate.nullable().optional(),
  })
  .strict(); // يرفض source / metadata

// ─── List query ─────────────────────────────────────
export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  search: z.string().max(200).optional(),
  due_before: isoDate.optional(),
  due_after: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
