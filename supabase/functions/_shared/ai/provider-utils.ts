/**
 * Pure AI helper bits — no Deno.env — so Vitest can cover them.
 */

export function providerLabelFromBaseUrl(baseUrl: string) {
  try {
    const host = new URL(baseUrl).host;
    if (host.includes("naga.ac")) return "naga";
    if (host.includes("openai.com")) return "openai";
  } catch {
    // keep default
  }
  return "openai-compatible";
}

export function uniqueChatModels(
  preferred: string,
  fallbacks: readonly string[],
) {
  return [preferred, ...fallbacks].filter(
    (model, index, all) => all.indexOf(model) === index,
  );
}

export function publicAiConfigView(config: {
  providerLabel: string;
  baseUrl: string;
  transcriptionModel: string;
  chatModel: string;
  apiKey: string | null;
}) {
  return {
    provider: config.providerLabel,
    baseUrl: config.baseUrl,
    transcriptionModel: config.transcriptionModel,
    chatModel: config.chatModel,
    apiKeyConfigured: Boolean(config.apiKey),
  };
}
