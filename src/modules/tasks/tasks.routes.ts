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

tasksRouter.post('/', validate(createTaskSchema), createController);

tasksRouter.post('/nl', validate(createNlTaskSchema), createNlController);

tasksRouter.get('/', validate(listTasksQuerySchema, 'query'), listController);
tasksRouter.get('/:id', getController);
tasksRouter.patch('/:id', validate(updateTaskSchema), updateController);
tasksRouter.delete('/:id', deleteController);
tasksRouter.post('/:id/complete', completeController);
tasksRouter.post('/:id/reopen', reopenController);
