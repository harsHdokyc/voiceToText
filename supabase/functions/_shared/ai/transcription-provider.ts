import type OpenAI from "npm:openai@4.104.0";

import { getAiConfig } from "./config.ts";
import { createOpenAiClient } from "./openai-client.ts";

export type TranscriptResult = {
  text: string;
  language?: string;
  durationSeconds?: number;
  model: string;
  provider: string;
};

/**
 * Server-side transcription via OpenAI-compatible /audio/transcriptions.
 * Default: official OpenAI `gpt-4o-mini-transcribe`.
 */
export async function transcribeAudio(params: {
  file: File;
  language?: string;
  client?: OpenAI;
}): Promise<TranscriptResult> {
  const config = getAiConfig();
  const client = params.client ?? createOpenAiClient(config);

  const transcript = await client.audio.transcriptions.create({
    model: config.transcriptionModel,
    file: params.file,
    ...(params.language ? { language: params.language } : {}),
  });

  return {
    text: transcript.text,
    model: config.transcriptionModel,
    provider: config.providerLabel,
  };
}
