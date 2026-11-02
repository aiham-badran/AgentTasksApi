// src/providers/types.ts
export interface ProviderConfig {
  id: 'groq' | 'google' | 'openrouter';
  displayName: string;
  /** Endpoint used to validate a key. Returns 200 when valid. */
  validateUrl: string;
  /** How to send the key: Bearer header, or ?key= query param. */
  authStyle: 'bearer' | 'query';
  /** Default model for this provider (used in M4b/M5). */
  defaultModel: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'groq' | 'google' | 'openrouter';
  /** Context window in tokens, if known. */
  contextWindow?: number;
}

export interface TaskDraft {
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null; // ISO 8601
  confidence: number; // 0..1
}

export interface ValidateResult {
  valid: boolean;
  status: 'ok' | 'invalid_key' | 'quota_exceeded' | 'provider_error';
  message?: string;
  usage?: { used: number | null; limit: number | null };
}

export interface LLMProvider {
  readonly id: 'groq' | 'google' | 'openrouter';
  readonly displayName: string;
  readonly defaultModel: string;

  validateKey(apiKey: string): Promise<ValidateResult>;
  listModels(apiKey: string): Promise<ModelInfo[]>;
  parseTask(input: string, apiKey: string, model?: string): Promise<TaskDraft>;
}
