// src/providers/registry.ts
import type { ProviderConfig } from './types.js';

export const PROVIDER_IDS = ['groq', 'google', 'openrouter'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_CONFIG: Record<ProviderId, ProviderConfig> = {
  groq: {
    id: 'groq',
    displayName: 'Groq',
    validateUrl: 'https://api.groq.com/openai/v1/models',
    authStyle: 'bearer',
    defaultModel: 'openai/gpt-oss-120b',
  },
  google: {
    id: 'google',
    displayName: 'Google Gemini',
    validateUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    authStyle: 'query',
    defaultModel: 'gemini-2.0-flash',
  },
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    validateUrl: 'https://openrouter.ai/api/v1/key',
    authStyle: 'bearer',
    defaultModel: 'openai/gpt-4o-mini',
  },
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}
