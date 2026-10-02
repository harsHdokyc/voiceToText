import OpenAI from "npm:openai@4.104.0";
import { z } from "npm:zod@3.25.76";

import { CHAT_MODEL_FALLBACKS, getAiConfig } from "./config.ts";
import { createOpenAiClient } from "./openai-client.ts";
import {
  isRetryableHttpStatus,
  uniqueChatModels,
} from "./provider-utils.ts";

export const TaskSuggestionSchema = z.object({
  title: z.string().min(1).max(200),
  details: z.string().max(1000).nullable(),
  kind: z.enum(["task", "reminder", "idea", "question", "follow_up"]),
  due_at: z.string().nullable(),
  priority: z.enum(["low", "normal", "high"]).nullable(),
  source_quote: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
});

export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;

function isRetryableUpstream(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  return isRetryableHttpStatus(error.status);
}

/**
 * Structured extraction via OpenAI-compatible chat completions + Zod.
 * Transcript is untrusted content, never system instructions.
 * ponytail: short retry chain across chat models on 408/429/5xx.
 */
export async function extractTasks(params: {
  transcript: string;
  client?: OpenAI;
}): Promise<{ suggestions: TaskSuggestion[]; model: string; provider: string }> {
  const config = getAiConfig();
  const client = params.client ?? createOpenAiClient(config);
  const models = uniqueChatModels(config.chatModel, CHAT_MODEL_FALLBACKS);

  let lastError: unknown;

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `Return JSON only: {"tasks": [{"title": string (1-200 chars), "details": string|null (max 1000), "kind": "task"|"reminder"|"idea"|"question"|"follow_up", "due_at": string|null (ISO date or null if ambiguous), "priority": "low"|"normal"|"high"|null (only if clear), "source_quote": string (1-500 chars, exact text from transcript), "confidence": "high"|"medium"|"low"}]}. No other keys. ` +
              `Extract only clearly stated or strongly implied actions. Never invent names, deadlines, commitments, or context. ` +
              `If date is ambiguous, return null for due_at and retain source_quote. No priority unless clearly stated. ` +
              `If no tasks found, return an empty array for tasks. Keep titles concise. Preserve traceability via source_quote.`,
          },
          {
            role: "user",
            content: params.transcript,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{"tasks":[]}';
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("invalid_json_from_model");
      }

      const validated = z.object({
        tasks: z.array(TaskSuggestionSchema),
      }).safeParse(parsed);
      if (!validated.success) {
        throw new Error("schema_validation_failed");
      }

      return {
        suggestions: validated.data.tasks,
        model: completion.model ?? model,
        provider: config.providerLabel,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableUpstream(error)) throw error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("ai_probe_failed");
}
