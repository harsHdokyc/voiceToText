import { z } from "npm:zod@3.25.76";

import { CHAT_MODEL_FALLBACKS, getAiConfig } from "./config.ts";
import { createChatModel } from "./langchain-gemini-client.ts";
import { edgeLog } from "../log.ts";
import {
  describeProcessError,
  isRetryableUpstream,
  messageContentToText,
  parseModelJson,
  uniqueChatModels,
} from "./provider-utils.ts";

export const TaskSuggestionSchema = z.object({
  title: z.string().min(1).max(200),
  details: z.string().max(1000).nullable(),
  kind: z.enum(["task", "reminder", "idea", "question", "follow_up"]),
  due_at: z.string().nullable(),
  priority: z.enum(["low", "normal", "high"]).nullable(),
  source_quote: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
});

export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;

const ExtractionSchema = z.object({
  tasks: z.array(TaskSuggestionSchema),
});

const EXTRACTION_SYSTEM =
  `Return JSON only: {"tasks": [{"title": string (1-200 chars), "details": string|null (max 1000), "kind": "task"|"reminder"|"idea"|"question"|"follow_up", "due_at": string|null (ISO date or null if ambiguous), "priority": "low"|"normal"|"high"|null (only if clear), "source_quote": string (1-500 chars, exact text from transcript), "confidence": "high"|"medium"|"low"}]}. No other keys. ` +
  `Extract only clearly stated or strongly implied actions. Never invent names, deadlines, commitments, or context. ` +
  `If date is ambiguous, return null for due_at and retain source_quote. No priority unless clearly stated. ` +
  `If no tasks found, return an empty array for tasks. Keep titles concise. Preserve traceability via source_quote.`;

/**
 * Structured extraction via LangChain ChatGoogleGenerativeAI + Zod.
 * Transcript is untrusted content, never system instructions.
 * ponytail: short retry chain across chat models on 404/408/429/5xx.
 * Zod validates after the call — not via withStructuredOutput (Gemini 400).
 */
export async function extractTasks(params: {
  transcript: string;
}): Promise<{ suggestions: TaskSuggestion[]; model: string; provider: string }> {
  const config = getAiConfig();
  const models = uniqueChatModels(config.chatModel, CHAT_MODEL_FALLBACKS);
  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i]!;
    try {
      const llm = createChatModel(model, config);
      const aiMsg = await llm.invoke([
        ["system", EXTRACTION_SYSTEM],
        ["human", params.transcript],
      ]);

      const raw = messageContentToText(aiMsg.content);
      let parsed: unknown;
      try {
        parsed = parseModelJson(raw);
      } catch {
        throw new Error("invalid_json_from_model");
      }

      const validated = ExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error("schema_validation_failed");
      }

      return {
        suggestions: validated.data.tasks,
        model,
        provider: config.providerLabel,
      };
    } catch (error) {
      lastError = error;
      const willRetry = isRetryableUpstream(error) && i + 1 < models.length;
      const { code, reason } = describeProcessError(error, "extraction_failed");
      edgeLog(willRetry ? "warn" : "error", "edge.ai.extract", {
        event: willRetry ? "retry" : "fail",
        code,
        reason,
        model,
        willRetry,
      });
      if (!willRetry) throw error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("ai_probe_failed");
}
