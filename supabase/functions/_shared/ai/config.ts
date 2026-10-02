/**
 * Edge AI config — OpenAI-compatible providers (Naga today, official OpenAI later).
 * Secrets stay in Supabase Edge secrets / functions/.env — never EXPO_PUBLIC_*.
 *
 * See docs/DECISIONS.md (Naga prototype provider).
 */

export type AiConfig = {
  apiKey: string | null;
  baseUrl: string;
  transcriptionModel: string;
  chatModel: string;
  providerLabel: string;
};

const DEFAULT_BASE_URL = "https://api.naga.ac/v1";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3:free";
/**
 * Prefer a smaller free chat model — large free instruct models often 503 when
 * Naga has no healthy upstream (see docs/DECISIONS.md).
 */
const DEFAULT_CHAT_MODEL = "llama-4-scout-17b-16e-instruct:free";

/** Tried in order after the configured chat model on retryable upstream failures. */
export const CHAT_MODEL_FALLBACKS = [
  "llama-4-scout-17b-16e-instruct:free",
  "nex-n2.5-mini:free",
  "llama-3.3-70b-instruct:free",
] as const;

export function getAiConfig(): AiConfig {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || null;
  const baseUrl =
    Deno.env.get("OPENAI_BASE_URL")?.trim() || DEFAULT_BASE_URL;
  const transcriptionModel =
    Deno.env.get("AI_TRANSCRIPTION_MODEL")?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL;
  const chatModel =
    Deno.env.get("AI_CHAT_MODEL")?.trim() || DEFAULT_CHAT_MODEL;

  let providerLabel = "openai-compatible";
  try {
    const host = new URL(baseUrl).host;
    if (host.includes("naga.ac")) providerLabel = "naga";
    else if (host.includes("openai.com")) providerLabel = "openai";
  } catch {
    // keep default label
  }

  return {
    apiKey,
    baseUrl,
    transcriptionModel,
    chatModel,
    providerLabel,
  };
}

/** Safe for client responses — no key material. */
export function publicAiConfig(config: AiConfig) {
  return {
    provider: config.providerLabel,
    baseUrl: config.baseUrl,
    transcriptionModel: config.transcriptionModel,
    chatModel: config.chatModel,
    apiKeyConfigured: Boolean(config.apiKey),
  };
}
