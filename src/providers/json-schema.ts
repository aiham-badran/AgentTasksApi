import { zodToJsonSchema } from 'zod-to-json-schema';
import { taskDraftSchema } from './task-draft.schema.js';

/**
 * Groq strict mode and OpenRouter json_schema require:
 *   - every property listed under `required`
 *   - `additionalProperties: false` on every object
 * `zodToJsonSchema` does not enforce this, so we post-process.
 */
function enforceStrict(node: Record<string, unknown>): Record<string, unknown> {
  if (node.type === 'object' && node.properties) {
    const props = node.properties as Record<string, Record<string, unknown>>;
    return {
      ...node,
      required: Object.keys(props),
      additionalProperties: false,
      properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, enforceStrict(v)])),
    };
  }
  return node;
}

/** JSON Schema for the TaskDraft, suitable for OpenAI-compatible APIs. */
export function getTaskDraftJsonSchema(): Record<string, unknown> {
  const schema = zodToJsonSchema(taskDraftSchema, {
    target: 'openAi',
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  return enforceStrict(schema);
}

/** Reusable Zod schema for post-parse validation (exported for tests). */
export { taskDraftSchema };
