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

export interface ValidateResult {
  valid: boolean;
  status: 'ok' | 'invalid_key' | 'quota_exceeded' | 'provider_error';
  message?: string;
  usage?: { used: number | null; limit: number | null };
}
