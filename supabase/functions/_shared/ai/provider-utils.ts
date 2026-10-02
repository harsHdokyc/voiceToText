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

/** Naga free upstreams flap with these statuses — safe to try the next model. */
export function isRetryableHttpStatus(status: unknown): boolean {
  return status === 408 || status === 429 || status === 500 || status === 503;
}

export type ProcessStage = "transcribing" | "extracting";

/** Map the failing pipeline stage to the note status machine outcome. */
export function failTargetForStage(stage: ProcessStage) {
  if (stage === "extracting") {
    return {
      failStatus: "extraction_failed" as const,
      expectStatus: "extracting" as const,
      fallbackCode: "extraction_failed",
    };
  }
  return {
    failStatus: "transcription_failed" as const,
    expectStatus: "transcribing" as const,
    fallbackCode: "transcription_failed",
  };
}

/**
 * Stable machine `code` + truncated human `reason` from provider/DB errors.
 * Never treat a bare "503 …" message as the code (that broke Phase 4 fail routing).
 */
export function describeProcessError(
  error: unknown,
  fallbackCode: string,
): { code: string; reason: string } {
  const reason = error instanceof Error
    ? error.message.slice(0, 200)
    : fallbackCode;

  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status: unknown }).status)
    : NaN;

  if (Number.isFinite(status) && status >= 400) {
    return {
      code: status === 503 ? "upstream_unavailable" : `upstream_${status}`,
      reason,
    };
  }

  if (/503|temporarily unavailable/i.test(reason)) {
    return { code: "upstream_unavailable", reason };
  }

  const fromPrefix = reason.includes(":")
    ? reason.split(":")[0]?.trim()
    : undefined;
  const code = (fromPrefix && fromPrefix.length > 0 && fromPrefix.length <= 64
    ? fromPrefix
    : fallbackCode).slice(0, 80);

  return { code, reason };
}
