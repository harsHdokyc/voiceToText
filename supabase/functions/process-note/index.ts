import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import {
  describeProcessError,
  failTargetForStage,
  type ProcessStage,
} from "../_shared/ai/provider-utils.ts";
import { extractTasks } from "../_shared/ai/task-extraction-provider.ts";
import { transcribeAudio } from "../_shared/ai/transcription-provider.ts";
import { edgeLog } from "../_shared/log.ts";

const TRANSCRIBE_CLAIMABLE = new Set(["queued", "transcription_failed"]);
/** Reclaim stuck `extracting` notes (Phase 4 bug left them there after chat 503). */
const EXTRACT_CLAIMABLE = new Set(["extraction_failed", "extracting"]);

function parseDueAt(raw: string | null): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Phase 4: claim note → transcribe (if needed) → extract → review_ready.
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
      edgeLog("error", "edge.process-note", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing user claims",
      });
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { noteId?: string };
    const noteId = body.noteId?.trim();
    if (!noteId) {
      edgeLog("error", "edge.process-note", {
        event: "fail",
        code: "note_id_required",
        reason: "Body.noteId missing",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "note_id_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.process-note", {
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
      edgeLog("error", "edge.process-note", {
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
      edgeLog("error", "edge.process-note", {
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
    const extractOnly = EXTRACT_CLAIMABLE.has(existing.status) && hasTranscript;
    const needsTranscribe = TRANSCRIBE_CLAIMABLE.has(existing.status);

    if (!needsTranscribe && !extractOnly) {
      edgeLog("info", "edge.process-note", {
        event: "skip",
        code: "not_claimable",
        reason: `Status ${existing.status} is not claimable`,
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

    if (needsTranscribe && !existing.audio_path) {
      edgeLog("error", "edge.process-note", {
        event: "fail",
        code: "audio_missing",
        reason: "audio_path is null",
        noteId,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "audio_missing" }, {
        status: 400,
      });
    }

    let stage: ProcessStage = needsTranscribe ? "transcribing" : "extracting";
    let transcriptText = hasTranscript ? String(existing.transcript) : "";
    let transcriptionProvider: string | null = null;
    let transcriptionModel: string | null = null;

    try {
      if (needsTranscribe) {
        const { data: claimed, error: claimError } = await ctx.supabase
          .from("notes")
          .update({
            status: "transcribing",
            processing_attempts: (existing.processing_attempts ?? 0) + 1,
            last_error_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId)
          .eq("user_id", userId)
          .in("status", ["queued", "transcription_failed"])
          .select("*")
          .maybeSingle();

        if (claimError || !claimed) {
          edgeLog("info", "edge.process-note", {
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
        transcriptionProvider = result.provider;
        transcriptionModel = result.model;
        transcriptText = result.text;

        const { data: transcribed, error: transcriptSaveError } = await ctx
          .supabase
          .from("notes")
          .update({
            transcript: result.text,
            status: "extracting",
            language: result.language ?? null,
            last_error_code: null,
            updated_at: new Date().toISOString(),
            title: existing.title ??
              (result.text.trim().slice(0, 48) || "Voice note"),
          })
          .eq("id", noteId)
          .eq("user_id", userId)
          .eq("status", "transcribing")
          .select("id, status, transcript")
          .maybeSingle();

        if (transcriptSaveError || !transcribed) {
          throw new Error(
            transcriptSaveError?.message
              ? `transcript_persist_failed: ${transcriptSaveError.message}`
              : "transcript_persist_failed",
          );
        }

        edgeLog("info", "edge.process-note", {
          event: "transcribe_ok",
          noteId,
          provider: result.provider,
          model: result.model,
          textLength: result.text.length,
        });
      } else {
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
          edgeLog("info", "edge.process-note", {
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
      }

      stage = "extracting";

      // Avoid duplicate pending rows on extraction retry.
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

      const { data: final, error: finalSaveError } = await ctx.supabase
        .from("notes")
        .update({
          status: "review_ready",
          last_error_code: null,
          updated_at: new Date().toISOString(),
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

      edgeLog("info", "edge.process-note", {
        event: "ok",
        noteId,
        status: final.status,
        transcriptionProvider,
        transcriptionModel,
        extractionProvider: extractionResult.provider,
        extractionModel: extractionResult.model,
        textLength: transcriptText.length,
        suggestionCount: insertedCount,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        status: final.status,
        transcriptionProvider,
        transcriptionModel,
        extractionProvider: extractionResult.provider,
        extractionModel: extractionResult.model,
        textLength: transcriptText.length,
        suggestionCount: insertedCount,
      });
    } catch (error) {
      const target = failTargetForStage(stage);
      const { code, reason } = describeProcessError(
        error,
        target.fallbackCode,
      );

      await ctx.supabase
        .from("notes")
        .update({
          status: target.failStatus,
          last_error_code: code.slice(0, 80),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("status", target.expectStatus);

      edgeLog("error", "edge.process-note", {
        event: "fail",
        code,
        reason,
        noteId,
        stage,
        status: target.failStatus,
        durationMs: Date.now() - started,
      });

      return Response.json(
        {
          ok: false,
          error: code,
          reason,
          status: target.failStatus,
        },
        { status: 502 },
      );
    }
  }),
};
