import { ChatGoogleGenerativeAI } from "npm:@langchain/google-genai@2.3.2";

import { getAiConfig, type AiConfig } from "./config.ts";

/**
 * LangChain chat client for Gemini (task extraction).
 * @see https://docs.langchain.com/oss/javascript/integrations/chat/google_generative_ai
 *
 * Use JSON mime type + app-side Zod — do not use withStructuredOutput().
 * Gemini rejects LangChain's Zod→responseSchema conversion for `.nullable()`
 * (`type: ["string","null"]` → 400 Unknown name "type").
 */
export function createChatModel(
  model: string,
  config: AiConfig = getAiConfig(),
) {
  if (!config.apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  // Gemini 3.x rejects legacy sampling params (temperature/top_p/top_k).
  return new ChatGoogleGenerativeAI({
    model,
    apiKey: config.apiKey,
    maxRetries: 0,
    json: true,
  });
}
