/**
 * Edge AI config — Google Gemini via LangChain (chat) + @google/genai (STT).
 * Secrets stay in Supabase Edge secrets / functions/.env — never EXPO_PUBLIC_*.
 *
 * See docs/DECISIONS.md / docs/17_DECISIONS.md.
 */

import { publicAiConfigView } from "./provider-utils.ts";

export type AiConfig = {
  apiKey: string | null;
  transcriptionModel: string;
  chatModel: string;
  providerLabel: string;
};

/** Dedicated STT model (Interactions API). */
const DEFAULT_TRANSCRIPTION_MODEL = "gemini-3.5-transcribe";
/** Primary chat model for structured task extraction. */
const DEFAULT_CHAT_MODEL = "gemini-3.8-flash";

/**
 * Tried in order after the configured chat model on retryable upstream failures.
 * Keep on current Gemini 3.x Flash IDs — 2.5 Flash is shut down for new projects.
 */
export const CHAT_MODEL_FALLBACKS = ["gemini-3.6-flash"] as const;

function readGoogleApiKey(): string | null {
  // LangChain docs use GOOGLE_API_KEY; Google GenAI SDK also accepts GEMINI_API_KEY.
  return (
    Deno.env.get("GOOGLE_API_KEY")?.trim() ||
    Deno.env.get("GEMINI_API_KEY")?.trim() ||
    null
  );
}

export function getAiConfig(): AiConfig {
  const transcriptionModel =
    Deno.env.get("AI_TRANSCRIPTION_MODEL")?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL;
  const chatModel =
    Deno.env.get("AI_CHAT_MODEL")?.trim() || DEFAULT_CHAT_MODEL;

  return {
    apiKey: readGoogleApiKey(),
    transcriptionModel,
    chatModel,
    providerLabel: "gemini",
  };
}

/** Safe for client responses — no key material. */
export function publicAiConfig(config: AiConfig) {
  return publicAiConfigView(config);
}
