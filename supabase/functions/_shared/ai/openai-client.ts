import OpenAI from "npm:openai@4.104.0";

import { getAiConfig, type AiConfig } from "./config.ts";

export function createOpenAiClient(config: AiConfig = getAiConfig()) {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}
