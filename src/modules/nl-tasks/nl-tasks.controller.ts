import type { Request, Response, NextFunction } from 'express';
import { createTaskFromNl } from './nl-tasks.service.js';
import type { CreateNlTaskInput } from './nl-tasks.schemas.js';

export async function createNlController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const task = await createTaskFromNl(req.user!.id, req.body as CreateNlTaskInput);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}
