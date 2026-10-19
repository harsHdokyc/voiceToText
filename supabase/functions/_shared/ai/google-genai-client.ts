import { GoogleGenAI } from "npm:@google/genai@2.30.0";

import { getAiConfig, type AiConfig } from "./config.ts";

/**
 * Official Google GenAI client — used for gemini-3.5-transcribe
 * (Interactions API; not covered by LangChain chat).
 */
export function createGoogleGenAiClient(config: AiConfig = getAiConfig()) {
  if (!config.apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  return new GoogleGenAI({ apiKey: config.apiKey });
}
