// src/modules/ai-keys/ai-keys.controller.ts
import type { Request, Response, NextFunction } from 'express';
import * as service from './ai-keys.service.js';
import type { ProviderId } from '../../providers/registry.js';
import type { ModelInfo } from '../../providers/types.js';

interface ProviderParam {
  provider: ProviderId;
}

export async function createController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { data, created } = await service.saveAiKey(req.user!.id, req.body);
    res.status(created ? 201 : 200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function listController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const keys = await service.listAiKeys(req.user!.id);
    res.status(200).json(keys);
  } catch (err) {
    next(err);
  }
}

export async function deleteController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider } = res.locals.validatedParams as ProviderParam;
    await service.deleteAiKey(req.user!.id, provider);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function validateController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider } = res.locals.validatedParams as ProviderParam;
    const result = await service.revalidateAiKey(req.user!.id, provider);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listModelsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider } = res.locals.validatedParams as ProviderParam;
    const models: ModelInfo[] = await service.listProviderModels(req.user!.id, provider);
    res.status(200).json(models);
  } catch (err) {
    next(err);
  }
}
