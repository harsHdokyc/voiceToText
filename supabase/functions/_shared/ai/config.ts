/**
 * Edge AI config — official OpenAI by default (OpenAI-compatible base URL still supported).
 * Secrets stay in Supabase Edge secrets / functions/.env — never EXPO_PUBLIC_*.
 *
 * See docs/DECISIONS.md.
 */

import {
  providerLabelFromBaseUrl,
  publicAiConfigView,
} from "./provider-utils.ts";

export type AiConfig = {
  apiKey: string | null;
  baseUrl: string;
  transcriptionModel: string;
  chatModel: string;
  providerLabel: string;
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** Cheap, reliable STT for ≤60s notes (~$0.003/min). */
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
/** Cheap chat model for structured task extraction. */
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

/**
 * Tried in order after the configured chat model on retryable upstream failures.
 * Keep short — OpenAI paid models rarely need a long free-tier flap chain.
 */
export const CHAT_MODEL_FALLBACKS = ["gpt-4o-mini"] as const;

export function getAiConfig(): AiConfig {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || null;
  const baseUrl =
    Deno.env.get("OPENAI_BASE_URL")?.trim() || DEFAULT_BASE_URL;
  const transcriptionModel =
    Deno.env.get("AI_TRANSCRIPTION_MODEL")?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL;
  const chatModel =
    Deno.env.get("AI_CHAT_MODEL")?.trim() || DEFAULT_CHAT_MODEL;

  return {
    apiKey,
    baseUrl,
    transcriptionModel,
    chatModel,
    providerLabel: providerLabelFromBaseUrl(baseUrl),
  };
}

/** Safe for client responses — no key material. */
export function publicAiConfig(config: AiConfig) {
  return publicAiConfigView(config);
}
