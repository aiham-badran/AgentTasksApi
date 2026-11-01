// src/modules/tasks/tasks.controller.ts
import type { Request, Response, NextFunction } from 'express';
import * as service from './tasks.service.js';
import { listTasksQuerySchema } from './tasks.schemas.js';

export async function createController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await service.createTask(req.user!.id, req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function listController(req: Request, res: Response, next: NextFunction) {
  try {
    // body/query already validated by middleware (if body); query inline:
    const query = (res.locals.validatedQuery ??
      listTasksQuerySchema.parse(req.query)) as ReturnType<typeof listTasksQuerySchema.parse>;
    const result = await service.listTasks(req.user!.id, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await service.getTask(req.user!.id, req.params.id!);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function updateController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await service.updateTask(req.user!.id, req.params.id!, req.body);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTask(req.user!.id, req.params.id!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function completeController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await service.completeTask(req.user!.id, req.params.id!);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}

export async function reopenController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await service.reopenTask(req.user!.id, req.params.id!);
    res.status(200).json(task);
  } catch (err) {
    next(err);
  }
}
