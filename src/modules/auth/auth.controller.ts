// src/modules/auth/auth.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { register, login, getCurrentUser } from './auth.service.js';

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
