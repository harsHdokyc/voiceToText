import { z } from "npm:zod@3.25.76";
import OpenAI from "npm:openai@4.104.0";

import { CHAT_MODEL_FALLBACKS, getAiConfig } from "./config.ts";
import { createOpenAiClient } from "./openai-client.ts";
import { uniqueChatModels } from "./provider-utils.ts";

/** Minimal spike schema — full TaskSuggestion lands in Phase 4. */
export const SpikeTaskSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["task", "idea"]),
});

export type SpikeTask = z.infer<typeof SpikeTaskSchema>;

function isRetryableUpstream(error: unknown) {
  if (!(error instanceof OpenAI.APIError)) return false;
  return error.status === 408 || error.status === 429 || error.status === 500 ||
    error.status === 503;
}

function chatModelCandidates(preferred: string) {
  return uniqueChatModels(preferred, CHAT_MODEL_FALLBACKS);
}

/**
 * Structured extraction via OpenAI-compatible chat completions + Zod.
 * Transcript/user text is untrusted content, never system instructions.
 * ponytail: one retry chain across free chat models — Naga :free upstreams flap.
 */
export async function extractSpikeTask(params: {
  transcript: string;
  client?: OpenAI;
}): Promise<{ task: SpikeTask; model: string; provider: string }> {
  const config = getAiConfig();
  const client = params.client ?? createOpenAiClient(config);
  const models = chatModelCandidates(config.chatModel);

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
              'Return JSON only: {"title": string, "kind": "task"|"idea"}. No other keys. Extract only clearly stated actions. Never invent deadlines or people.',
          },
          {
            role: "user",
            content: params.transcript,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("invalid_json_from_model");
      }

      const validated = SpikeTaskSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error("schema_validation_failed");
      }

      return {
        task: validated.data,
        model: completion.model ?? model,
        provider: config.providerLabel,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableUpstream(error)) throw error;
      // try next free model
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("ai_probe_failed");
}
