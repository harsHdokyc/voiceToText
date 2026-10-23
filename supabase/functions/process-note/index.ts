import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { describeProcessError } from "../_shared/ai/provider-utils.ts";
import { transcribeAudio } from "../_shared/ai/transcription-provider.ts";
import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import {
  noteLifecycle,
  TRANSCRIBE_CLAIMABLE,
} from "../_shared/notes/note-lifecycle.ts";

const SCOPE = "edge.process-note";
/** Phase 7: daily process-note cap per user (content-free quota). */
const DAILY_PROCESS_NOTE_LIMIT = 40;

/**
 * Transcription-only (free-tier wall-clock). Client chains `extract-note` next.
 * Body: `{ "noteId": "<uuid>" }`
 *
 * After success status is `extracting` (transcript saved) — not `review_ready`.
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const r = edgeRequest(SCOPE);
    const userId = ctx.userClaims?.id;
    if (!userId) {
      return r.fail(401, "unauthorized", "Missing user claims");
    }

    const body = (await req.json().catch(() => ({}))) as { noteId?: string };
    const noteId = body.noteId?.trim();
    if (!noteId) {
      return r.fail(400, "note_id_required", "Body.noteId missing");
    }

    edgeLog("info", SCOPE, { event: "start", noteId });

    const { data: existing, error: loadError } = await ctx.supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (loadError) {
      return r.fail(500, "note_load_failed", loadError.message, { noteId });
    }
    if (!existing) {
      return r.fail(
        404,
        "note_not_found",
        "Note missing or not owned by caller",
        {
          noteId,
        },
      );
    }

    if (!TRANSCRIBE_CLAIMABLE.includes(existing.status)) {
      edgeLog("info", SCOPE, {
        event: "skip",
        code: "not_claimable",
        reason: `Status ${existing.status} is not claimable for transcription`,
        noteId,
        status: existing.status,
        durationMs: r.ms(),
      });
      return Response.json({
        ok: true,
        skipped: true,
        status: existing.status,
        reason: "not_claimable",
      });
    }

    if (!existing.audio_path) {
      return existing.audio_purged_at
        ? r.fail(
          400,
          "audio_purged",
          "Audio deleted after the 3 day retention window",
          { noteId },
        )
        : r.fail(400, "audio_missing", "audio_path is null", { noteId });
    }

    const { data: usageCount, error: usageError } = await ctx.supabase.rpc(
      "count_ai_usage_today",
      { p_user_id: userId, p_kind: "process_note" },
    );
    if (usageError) {
      edgeLog("warn", SCOPE, {
        event: "usage_count_failed",
        code: "usage_count_failed",
        reason: usageError.message.slice(0, 200),
        noteId,
      });
    } else if (
      typeof usageCount === "number" &&
      usageCount >= DAILY_PROCESS_NOTE_LIMIT
    ) {
      return r.fail(
        429,
        "rate_limited",
        `Daily process-note limit ${DAILY_PROCESS_NOTE_LIMIT} reached`,
        { noteId, usageCount },
      );
    }

    const note = noteLifecycle(ctx.supabase, noteId, userId);
    try {
      const { row: claimed, error: claimError } = await note.claim(
        "transcribe",
        TRANSCRIBE_CLAIMABLE,
        { processing_attempts: (existing.processing_attempts ?? 0) + 1 },
      );

      if (claimError || !claimed) {
        edgeLog("info", SCOPE, {
          event: "skip",
          code: "claim_lost",
          reason: claimError ?? "Conditional claim matched no row",
          noteId,
          durationMs: r.ms(),
        });
        return Response.json({
          ok: true,
          skipped: true,
          reason: "claim_lost",
        });
      }

      const { data: fileData, error: downloadError } = await ctx.supabase
        .storage
        .from("note-audio")
        .download(existing.audio_path);

      if (downloadError || !fileData) {
        throw new Error(
          downloadError?.message
            ? `audio_download_failed: ${downloadError.message}`
            : "audio_download_failed",
        );
      }

      const filename = existing.audio_path.split("/").pop() ?? "original.m4a";
      const file = new File([fileData], filename, {
        type: existing.audio_mime_type ?? "audio/mp4",
      });

      const result = await transcribeAudio({ file });

      // Title/category come from extract-note (AI). Do not paste transcript prefix.
      const { row: transcribed, error: transcriptSaveError } = await note
        .complete("transcribe", "extracting", {
          transcript: result.text,
          language: result.language ?? null,
        });

      if (transcriptSaveError || !transcribed) {
        throw new Error(
          transcriptSaveError
            ? `transcript_persist_failed: ${transcriptSaveError}`
            : "transcript_persist_failed",
        );
      }

      edgeLog("info", SCOPE, {
        event: "transcribe_ok",
        noteId,
        provider: result.provider,
        model: result.model,
        textLength: result.text.length,
        durationMs: r.ms(),
      });

      await ctx.supabase.from("ai_usage_events").insert({
        user_id: userId,
        kind: "process_note",
        model: result.model,
        provider: result.provider,
        duration_ms: r.ms(),
        audio_seconds: existing.audio_duration_seconds ?? null,
        suggestion_count: 0,
      });

      return Response.json({
        ok: true,
        status: transcribed.status,
        transcriptionProvider: result.provider,
        transcriptionModel: result.model,
        textLength: result.text.length,
        extractionSkipped: true,
      });
    } catch (error) {
      const { code, reason } = describeProcessError(
        error,
        "transcription_failed",
      );

      await note.fail("transcribe", code);

      return r.fail(
        502,
        code,
        reason,
        { noteId, status: "transcription_failed" },
        { status: "transcription_failed" },
      );
    }
  }),
};
