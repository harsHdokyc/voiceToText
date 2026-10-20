import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import {
  describeProcessError,
  reclaimStuckExtracting,
} from "../_shared/ai/provider-utils.ts";
import { extractTasks } from "../_shared/ai/task-extraction-provider.ts";
import { edgeLog } from "../_shared/log.ts";

/** Reclaim stuck `extracting` notes. */
const EXTRACT_CLAIMABLE = new Set(["extraction_failed", "extracting"]);

function parseDueAt(raw: string | null): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Extraction-only (free-tier wall-clock). Transcription is `process-note`.
 * Body: `{ "noteId": "<uuid>" }`
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      edgeLog("error", "edge.extract-note", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing user claims",
      });
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { noteId?: string };
    const noteId = body.noteId?.trim();
    if (!noteId) {
      edgeLog("error", "edge.extract-note", {
        event: "fail",
        code: "note_id_required",
        reason: "Body.noteId missing",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "note_id_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.extract-note", {
      event: "start",
      noteId,
    });

    const { data: existing, error: loadError } = await ctx.supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (loadError) {
      edgeLog("error", "edge.extract-note", {
        event: "fail",
        code: "note_load_failed",
        reason: loadError.message,
        noteId,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "note_load_failed" }, {
        status: 500,
      });
    }
    if (!existing) {
      edgeLog("error", "edge.extract-note", {
        event: "fail",
        code: "note_not_found",
        reason: "Note missing or not owned by caller",
        noteId,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "note_not_found" }, {
        status: 404,
      });
    }

    const hasTranscript = Boolean(
      typeof existing.transcript === "string" && existing.transcript.trim(),
    );

    // Flip stale wall-clock kills to extraction_failed, then continue claim.
    const reclaimed = await reclaimStuckExtracting(
      ctx.supabase,
      noteId,
      userId,
    );
    if (reclaimed) {
      edgeLog("warn", "edge.extract-note", {
        event: "stale_reclaim",
        noteId,
        status: existing.status,
        updated_at: existing.updated_at,
      });
      existing.status = "extraction_failed";
    }

    const extractOnly = EXTRACT_CLAIMABLE.has(existing.status) && hasTranscript;
    if (!extractOnly) {
      edgeLog("info", "edge.extract-note", {
        event: "skip",
        code: "not_claimable",
        reason: `Status ${existing.status} is not claimable for extraction`,
        noteId,
        status: existing.status,
        durationMs: Date.now() - started,
      });
      return Response.json({
        ok: true,
        skipped: true,
        status: existing.status,
        reason: "not_claimable",
      });
    }

    try {
      const { data: claimed, error: claimError } = await ctx.supabase
        .from("notes")
        .update({
          status: "extracting",
          processing_attempts: (existing.processing_attempts ?? 0) + 1,
          last_error_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .in("status", ["extraction_failed", "extracting"])
        .select("id, status")
        .maybeSingle();

      if (claimError || !claimed) {
        edgeLog("info", "edge.extract-note", {
          event: "skip",
          code: "claim_lost",
          reason: claimError?.message ?? "Conditional claim matched no row",
          noteId,
          durationMs: Date.now() - started,
        });
        return Response.json({
          ok: true,
          skipped: true,
          reason: "claim_lost",
        });
      }

      const transcriptText = String(existing.transcript);

      const { error: clearError } = await ctx.supabase
        .from("task_suggestions")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", userId)
        .eq("status", "pending");
      if (clearError) {
        throw new Error(`suggestions_clear_failed: ${clearError.message}`);
      }

      const extractionResult = await extractTasks({
        transcript: transcriptText,
      });

      const suggestionsToInsert = extractionResult.suggestions.map((s) => ({
        user_id: userId,
        note_id: noteId,
        title: s.title,
        details: s.details,
        kind: s.kind,
        due_at: parseDueAt(s.due_at),
        priority: s.priority,
        source_quote: s.source_quote,
        confidence: s.confidence,
        status: "pending" as const,
      }));

      let insertedCount = 0;
      if (suggestionsToInsert.length > 0) {
        const { error: insertError } = await ctx.supabase
          .from("task_suggestions")
          .insert(suggestionsToInsert);
        if (insertError) {
          throw new Error(`suggestions_insert_failed: ${insertError.message}`);
        }
        insertedCount = suggestionsToInsert.length;
      }

      // Keep a user-entered capture title; otherwise use the AI card title.
      const userTitle =
        typeof existing.title === "string" ? existing.title.trim() : "";
      const { data: final, error: finalSaveError } = await ctx.supabase
        .from("notes")
        .update({
          status: "review_ready",
          last_error_code: null,
          updated_at: new Date().toISOString(),
          title: userTitle || extractionResult.noteTitle,
          category: extractionResult.noteCategory,
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("status", "extracting")
        .select("id, status")
        .maybeSingle();

      if (finalSaveError || !final) {
        throw new Error(
          finalSaveError?.message
            ? `final_status_update_failed: ${finalSaveError.message}`
            : "final_status_update_failed",
        );
      }

      edgeLog("info", "edge.extract-note", {
        event: "ok",
        noteId,
        status: final.status,
        extractionProvider: extractionResult.provider,
        extractionModel: extractionResult.model,
        textLength: transcriptText.length,
        suggestionCount: insertedCount,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        status: final.status,
        extractionProvider: extractionResult.provider,
        extractionModel: extractionResult.model,
        textLength: transcriptText.length,
        suggestionCount: insertedCount,
      });
    } catch (error) {
      const { code, reason } = describeProcessError(error, "extraction_failed");

      await ctx.supabase
        .from("notes")
        .update({
          status: "extraction_failed",
          last_error_code: code.slice(0, 80),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("status", "extracting");

      edgeLog("error", "edge.extract-note", {
        event: "fail",
        code,
        reason,
        noteId,
        status: "extraction_failed",
        durationMs: Date.now() - started,
      });

      return Response.json(
        {
          ok: false,
          error: code,
          reason,
          status: "extraction_failed",
        },
        { status: 502 },
      );
    }
  }),
};
