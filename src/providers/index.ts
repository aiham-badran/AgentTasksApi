// src/providers/index.ts
import type { LLMProvider } from './types.js';
import type { ProviderId } from './registry.js';
import { groqProvider } from './groq.provider.js';
import { googleProvider } from './google.provider.js';
import { openrouterProvider } from './openrouter.provider.js';

const REGISTRY: Record<ProviderId, LLMProvider> = {
  groq: groqProvider,
  google: googleProvider,
  openrouter: openrouterProvider,
};

export function getProvider(id: string): LLMProvider {
  const provider = REGISTRY[id as ProviderId];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return provider;
}

export { groqProvider, googleProvider, openrouterProvider };
export type { LLMProvider, ModelInfo, TaskDraft } from './types.js';
