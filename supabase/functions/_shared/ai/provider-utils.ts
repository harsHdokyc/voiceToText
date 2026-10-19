/**
 * Pure AI helper bits — no Deno.env — so Vitest can cover them.
 */

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
  transcriptionModel: string;
  chatModel: string;
  apiKey: string | null;
}) {
  return {
    provider: config.providerLabel,
    transcriptionModel: config.transcriptionModel,
    chatModel: config.chatModel,
    apiKeyConfigured: Boolean(config.apiKey),
  };
}

/** Pull HTTP status from LangChain / Google / generic SDK errors. */
export function upstreamHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  for (const key of ["status", "statusCode", "httpStatusCode"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  const response = record.response;
  if (response && typeof response === "object" && "status" in response) {
    const status = (response as { status: unknown }).status;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }
  return undefined;
}

/** Retryable upstream statuses for the chat model fallback chain (incl. retired 404). */
export function isRetryableHttpStatus(status: unknown): boolean {
  return (
    status === 404 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 503
  );
}

/** True when the provider says this model id is gone / unavailable. */
export function isRetiredModelError(error: unknown): boolean {
  if (upstreamHttpStatus(error) === 404) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /no longer|not found|is not found|not supported/i.test(message);
}

/** Whether extractTasks should try the next chat model. */
export function isRetryableUpstream(error: unknown): boolean {
  return (
    isRetryableHttpStatus(upstreamHttpStatus(error)) ||
    isRetiredModelError(error)
  );
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
    ? error.message.slice(0, 300)
    : String(error ?? fallbackCode).slice(0, 300);
  const status = upstreamHttpStatus(error);

  if (status !== undefined && status >= 400) {
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

/** Flatten LangChain AIMessage content to plain text. */
export function messageContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

/** Parse model JSON, tolerating optional ```json fences. */
export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(unfenced);
}

/** Chunked base64 so large audio buffers do not blow the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Resolve a Gemini-supported audio MIME from File metadata / name. */
export function mimeTypeForAudioFile(file: {
  type?: string;
  name?: string;
}): string {
  const declared = file.type?.trim().toLowerCase();
  if (declared && declared !== "application/octet-stream") {
    if (declared === "audio/mp4") return "audio/m4a";
    if (declared === "audio/x-m4a") return "audio/m4a";
    if (declared === "audio/mpeg") return "audio/mp3";
    return declared;
  }

  const name = (file.name ?? "").toLowerCase();
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".mp3")) return "audio/mp3";
  if (name.endsWith(".m4a")) return "audio/m4a";
  if (name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".ogg")) return "audio/ogg";
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".webm")) return "audio/webm";
  if (name.endsWith(".aiff") || name.endsWith(".aif")) return "audio/aiff";
  return "audio/mp3";
}
