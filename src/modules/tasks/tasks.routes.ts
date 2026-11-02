// src/modules/tasks/tasks.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from './tasks.schemas.js';
import {
  createController,
  listController,
  getController,
  updateController,
  deleteController,
  completeController,
  reopenController,
} from './tasks.controller.js';
import { createNlController } from '../nl-tasks/nl-tasks.controller.js';
import { createNlTaskSchema } from '../nl-tasks/nl-tasks.schemas.js';

export const tasksRouter = Router();

// كل المسارات محمية
tasksRouter.use(requireAuth);

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a task manually
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 */
tasksRouter.post('/', validate(createTaskSchema), createController);

/**
 * @swagger
 * /api/v1/tasks/nl:
 *   post:
 *     summary: Create a task from natural language
 *     description: |
 *       Parses free text like "remind me to call Sara tomorrow 5pm" into a structured task.
 *       Requires a configured AI provider key (BYOK).
 *     tags: [NL Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNlTaskInput'
 *           example:
 *             text: remind me to call Sara tomorrow at 5pm urgently
 *     responses:
 *       201:
 *         description: Task created from NL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Provider rejected the stored key (AI_KEY_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       428:
 *         description: No AI key configured (AI_KEY_MISSING)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Provider quota exceeded (AI_QUOTA_EXCEEDED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Provider error (AI_PROVIDER_ERROR)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tasksRouter.post('/nl', validate(createNlTaskSchema), createNlController);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: List tasks with filters and pagination
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, in_progress, completed, cancelled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 200 }
 *         description: Searches title and description
 *       - in: query
 *         name: due_before
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: due_after
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: 'created_at:desc' }
 *         description: 'Format: field:direction (field ∈ created_at|updated_at|due_date|priority|title)'
 *     responses:
 *       200:
 *         description: Paginated task list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 */
tasksRouter.get('/', validate(listTasksQuerySchema, 'query'), listController);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
tasksRouter.get('/:id', getController);

tasksRouter.patch('/:id', validate(updateTaskSchema), updateController);
tasksRouter.delete('/:id', deleteController);
tasksRouter.post('/:id/complete', completeController);
tasksRouter.post('/:id/reopen', reopenController);
