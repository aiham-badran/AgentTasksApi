// src/providers/openrouter.provider.ts
import type { LLMProvider, ModelInfo, TaskDraft, ValidateResult } from './types.js';
import { postJson, getJson, buildTaskPrompt } from './http.js';
import { getTaskDraftJsonSchema, taskDraftSchema } from './json-schema.js';
import { AiProviderError } from '../utils/errors.js';
import { validateProviderKey } from './validate.js';

const BASE = 'https://openrouter.ai/api/v1';

export const openrouterProvider: LLMProvider = {
  id: 'openrouter',
  displayName: 'OpenRouter',
  defaultModel: 'openai/gpt-4o-mini',

  async validateKey(apiKey) {
    return validateProviderKey('openrouter', apiKey);
  },

  async listModels(apiKey): Promise<ModelInfo[]> {
    const body = (await getJson(`${BASE}/models`, {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    })) as { data?: Array<{ id: string; name?: string; context_length?: number }> };

    return (body.data ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      provider: 'openrouter',
      contextWindow: m.context_length,
    }));
  },

  async parseTask(input, apiKey, model): Promise<TaskDraft> {
    const response = (await postJson(
      `${BASE}/chat/completions`,
      { Authorization: `Bearer ${apiKey}` },
      {
        model: model ?? 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: buildTaskPrompt() },
          { role: 'user', content: input },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'task_draft',
            strict: true,
            schema: getTaskDraftJsonSchema(),
          },
        },
      },
    )) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new AiProviderError('Empty LLM response.');

    try {
      return taskDraftSchema.parse(JSON.parse(content));
    } catch {
      throw new AiProviderError('LLM returned invalid task JSON.');
    }
  },
};
