// src/providers/groq.provider.ts
import type { LLMProvider, ModelInfo, TaskDraft, ValidateResult } from './types.js';
import { postJson, getJson, buildTaskPrompt } from './http.js';
import { getTaskDraftJsonSchema, taskDraftSchema } from './json-schema.js';
import { AiProviderError } from '../utils/errors.js';
import { validateProviderKey } from './validate.js';

const BASE = 'https://api.groq.com/openai/v1';

export const groqProvider: LLMProvider = {
  id: 'groq',
  displayName: 'Groq',
  defaultModel: 'openai/gpt-oss-120b',

  async validateKey(apiKey) {
    return validateProviderKey('groq', apiKey);
  },

  async listModels(apiKey): Promise<ModelInfo[]> {
    const body = (await getJson(`${BASE}/models`, {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    })) as { data?: Array<{ id: string; owned_by?: string }> };

    return (body.data ?? []).map((m) => ({
      id: m.id,
      name: m.id,
      provider: 'groq',
    }));
  },

  async parseTask(input, apiKey, model): Promise<TaskDraft> {
    const response = (await postJson(
      `${BASE}/chat/completions`,
      { Authorization: `Bearer ${apiKey}` },
      {
        model: model ?? 'openai/gpt-oss-120b',
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
      const parsed = JSON.parse(content);
      return taskDraftSchema.parse(parsed);
    } catch {
      throw new AiProviderError('LLM returned invalid task JSON.');
    }
  },
};
