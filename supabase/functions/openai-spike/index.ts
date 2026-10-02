import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { getAiConfig, publicAiConfig } from "../_shared/ai/config.ts";
import { extractTasks } from "../_shared/ai/task-extraction-provider.ts";
import { transcribeAudio } from "../_shared/ai/transcription-provider.ts";

/**
 * AI runtime spike (OpenAI SDK → Naga by default).
 *
 * Body JSON:
 * - `{ "probe": "config" }` — provider/models/key presence (no secrets)
 * - `{ "probe": "chat" }` — structured extraction sample (needs OPENAI_API_KEY)
 * - `{ "probe": "transcribe" }` — multipart also accepted; JSON with base64:
 *   `{ "probe": "transcribe", "filename": "clip.m4a", "audioBase64": "..." }`
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const config = getAiConfig();
    const contentType = req.headers.get("content-type") ?? "";

    let probe = "chat";
    let transcriptText = "Buy milk tomorrow.";
    let audioFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      probe = String(form.get("probe") ?? "transcribe");
      const file = form.get("file");
      if (file instanceof File) audioFile = file;
    } else {
      const body = (await req.json().catch(() => ({}))) as {
        probe?: string;
        transcript?: string;
        filename?: string;
        audioBase64?: string;
      };
      probe = body.probe ?? "chat";
      if (body.transcript) transcriptText = body.transcript;

      if (body.audioBase64 && body.filename) {
        const bytes = Uint8Array.from(atob(body.audioBase64), (c) =>
          c.charCodeAt(0),
        );
        audioFile = new File([bytes], body.filename);
      }
    }

    if (probe === "config") {
      return Response.json({
        ok: true,
        skipped: false,
        ...publicAiConfig(config),
        notes: [
          "Prototype provider is Naga (OpenAI-compatible).",
          ":free models may use prompts/outputs for training — see DECISIONS.md.",
          "Free tier rate limits: 10/min and 100/day shared across :free models.",
        ],
      });
    }

    if (!config.apiKey) {
      return Response.json({
        ok: true,
        skipped: true,
        reason:
          "OPENAI_API_KEY not set — add Naga API key via Supabase Edge secrets (OPENAI_API_KEY) plus OPENAI_BASE_URL=https://api.naga.ac/v1",
        ...publicAiConfig(config),
      });
    }

    try {
      if (probe === "transcribe") {
        if (!audioFile) {
          return Response.json({
            ok: true,
            skipped: true,
            reason:
              "No audio file — send multipart file or JSON { audioBase64, filename }",
            ...publicAiConfig(config),
          });
        }

        const result = await transcribeAudio({ file: audioFile });
        return Response.json({
          ok: true,
          skipped: false,
          probe: "transcribe",
          provider: result.provider,
          model: result.model,
          textLength: result.text.length,
          hasText: result.text.trim().length > 0,
        });
      }

      const extracted = await extractTasks({ transcript: transcriptText });
      return Response.json({
        ok: true,
        skipped: false,
        probe: "chat",
        provider: extracted.provider,
        model: extracted.model,
        suggestionCount: extracted.suggestions.length,
        sample: extracted.suggestions[0] ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ai_probe_failed";
      const upstreamUnavailable = /503|temporarily unavailable|rate_limit/i
        .test(message);
      return Response.json(
        {
          ok: false,
          error: message,
          hint: upstreamUnavailable
            ? "Naga free upstream is down or limited — retry, or set AI_CHAT_MODEL to another free/paid model in Edge secrets."
            : undefined,
          ...publicAiConfig(config),
        },
        { status: upstreamUnavailable ? 503 : 502 },
      );
    }
  }),
};
