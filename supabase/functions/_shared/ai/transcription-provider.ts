import type { GoogleGenAI } from "npm:@google/genai@2.30.0";

import { getAiConfig } from "./config.ts";
import { createGoogleGenAiClient } from "./google-genai-client.ts";
import { edgeLog } from "../log.ts";
import {
  bytesToBase64,
  describeProcessError,
  mimeTypeForAudioFile,
} from "./provider-utils.ts";

export type TranscriptResult = {
  text: string;
  language?: string;
  durationSeconds?: number;
  model: string;
  provider: string;
};

/**
 * Server-side transcription via Gemini 3.5 Transcribe (Interactions API).
 * Default model: `gemini-3.5-transcribe`.
 *
 * This model does **not** support system instructions. Guidance is via
 * `transcription_config` — we use smart mode (clean readable text for extraction).
 * @see https://ai.google.dev/gemini-api/docs/transcribe
 */
export async function transcribeAudio(params: {
  file: File;
  language?: string;
  client?: GoogleGenAI;
}): Promise<TranscriptResult> {
  const config = getAiConfig();
  const mimeType = mimeTypeForAudioFile(params.file);
  const bytes = new Uint8Array(await params.file.arrayBuffer());

  try {
    const client = params.client ?? createGoogleGenAiClient(config);
    const interaction = await client.interactions.create({
      model: config.transcriptionModel,
      input: [
        {
          type: "audio",
          data: bytesToBase64(bytes),
          mime_type: mimeType,
        },
      ],
      generation_config: {
        transcription_config: {
          // Clean fillers / false starts so extraction sees readable speech.
          mode: "smart",
          // Hint when known; empty = auto-detect + code-switching.
          language_codes: params.language ? [params.language] : [],
        },
      },
    });

    const text = typeof interaction.output_text === "string"
      ? interaction.output_text
      : "";

    return {
      text,
      model: config.transcriptionModel,
      provider: config.providerLabel,
    };
  } catch (error) {
    const { code, reason } = describeProcessError(error, "transcription_failed");
    edgeLog("error", "edge.ai.transcribe", {
      event: "fail",
      code,
      reason,
      model: config.transcriptionModel,
      mimeType,
    });
    throw error;
  }
}
