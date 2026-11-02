// src/providers/google.provider.ts
import type { LLMProvider, ModelInfo, TaskDraft, ValidateResult } from './types.js';
import { postJson, getJson, buildTaskPrompt } from './http.js';
import { getTaskDraftJsonSchema, taskDraftSchema } from './json-schema.js';
import { AiProviderError } from '../utils/errors.js';
import { validateProviderKey } from './validate.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const googleProvider: LLMProvider = {
  id: 'google',
  displayName: 'Google Gemini',
  defaultModel: 'gemini-2.0-flash',

  async validateKey(apiKey) {
    return validateProviderKey('google', apiKey);
  },

  async listModels(apiKey): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ key: apiKey });
      if (pageToken) params.set('pageToken', pageToken);

      const body = (await getJson(`${BASE}/models?${params.toString()}`, {
        Accept: 'application/json',
      })) as {
        models?: Array<{ name: string; displayName?: string; inputTokenLimit?: number }>;
        nextPageToken?: string;
      };

      for (const m of body.models ?? []) {
        models.push({
          id: m.name.replace(/^models\//, ''),
          name: m.displayName ?? m.name.replace(/^models\//, ''),
          provider: 'google',
          contextWindow: m.inputTokenLimit,
        });
      }
      pageToken = body.nextPageToken;
    } while (pageToken);

    return models;
  },

  async parseTask(input, apiKey, model): Promise<TaskDraft> {
    const selected = model ?? 'gemini-2.0-flash';
    const url = `${BASE}/models/${selected}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = (await postJson(
      url,
      {},
      {
        contents: [{ parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: buildTaskPrompt() }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: getTaskDraftJsonSchema(),
        },
      },
    )) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new AiProviderError('Empty LLM response.');

    try {
      return taskDraftSchema.parse(JSON.parse(content));
    } catch {
      throw new AiProviderError('LLM returned invalid task JSON.');
    }
  },
};
