import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { describeProcessError } from "../_shared/ai/provider-utils.ts";
import { extractTasks } from "../_shared/ai/task-extraction-provider.ts";
import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import { noteLifecycle } from "../_shared/notes/note-lifecycle.ts";
import { reextractClaimStatuses } from "../_shared/storage/audio-retention.ts";
import {
  localIso,
  parseDueAt,
  resolveTimeZone,
} from "../_shared/time/user-time.ts";

const SCOPE = "edge.extract-note";

/**
 * Extraction-only (free-tier wall-clock). Transcription is `process-note`.
 * Body: `{ "noteId": "<uuid>" }`
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

    const body = (await req.json().catch(() => ({}))) as {
      noteId?: string;
      /** Device IANA zone; preferred over profile when the sync race loses. */
      timeZone?: string;
    };
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

    const note = noteLifecycle(ctx.supabase, noteId, userId);

    // Flip stale wall-clock kills to extraction_failed, then continue claim.
    if (await note.reclaimStuckExtracting()) {
      edgeLog("warn", SCOPE, {
        event: "stale_reclaim",
        noteId,
        status: existing.status,
        updated_at: existing.updated_at,
      });
      existing.status = "extraction_failed";
    }

    const claimStatuses = reextractClaimStatuses({
      status: existing.status,
      transcript: existing.transcript,
      audio_path: existing.audio_path,
      audio_purged_at: existing.audio_purged_at,
    });
    if (!claimStatuses) {
      edgeLog("info", SCOPE, {
        event: "skip",
        code: "not_claimable",
        reason: `Status ${existing.status} is not claimable for extraction`,
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

    try {
      const { row: claimed, error: claimError } = await note.claim(
        "extract",
        claimStatuses,
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

      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("timezone")
        .eq("id", userId)
        .maybeSingle();
      // Device zone from the client wins when profile sync has not landed yet.
      const timeZone = resolveTimeZone(
        body.timeZone?.trim() || profile?.timezone,
      );

      const extractionResult = await extractTasks({
        transcript: transcriptText,
        localNow: `${localIso(Date.now(), timeZone)} (${timeZone})`,
      });

      const suggestionsToInsert = extractionResult.suggestions.map((s) => ({
        user_id: userId,
        note_id: noteId,
        title: s.title,
        details: s.details,
        kind: s.kind,
        due_at: parseDueAt(s.due_at, timeZone),
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
      const userTitle = typeof existing.title === "string"
        ? existing.title.trim()
        : "";
      const { row: final, error: finalSaveError } = await note.complete(
        "extract",
        "review_ready",
        {
          title: userTitle || extractionResult.noteTitle,
          category: extractionResult.noteCategory,
        },
      );

      if (finalSaveError || !final) {
        throw new Error(
          finalSaveError
            ? `final_status_update_failed: ${finalSaveError}`
            : "final_status_update_failed",
        );
      }

      edgeLog("info", SCOPE, {
        event: "ok",
        noteId,
        timeZone,
        status: final.status,
        extractionProvider: extractionResult.provider,
        extractionModel: extractionResult.model,
        textLength: transcriptText.length,
        suggestionCount: insertedCount,
        durationMs: r.ms(),
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

      await note.fail("extract", code);

      return r.fail(
        502,
        code,
        reason,
        { noteId, status: "extraction_failed" },
        { status: "extraction_failed" },
      );
    }
  }),
};
