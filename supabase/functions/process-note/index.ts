import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { transcribeAudio } from "../_shared/ai/transcription-provider.ts";
import { edgeLog } from "../_shared/log.ts";

const CLAIMABLE = new Set(["queued", "transcription_failed"]);

/**
 * Phase 3: claim a queued note, transcribe private audio, persist transcript.
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
    if (!CLAIMABLE.has(existing.status)) {
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
    if (!existing.audio_path) {
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

    try {
      const { data: fileData, error: downloadError } = await ctx.supabase.storage
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
      const file = new File(
        [fileData],
        filename,
        { type: existing.audio_mime_type ?? "audio/mp4" },
      );

      const result = await transcribeAudio({ file });

      const { data: updated, error: saveError } = await ctx.supabase
        .from("notes")
        .update({
          transcript: result.text,
          status: "review_ready",
          language: result.language ?? null,
          last_error_code: null,
          updated_at: new Date().toISOString(),
          title: existing.title ??
            (result.text.trim().slice(0, 48) || "Voice note"),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("status", "transcribing")
        .select("id, status")
        .maybeSingle();

      if (saveError || !updated) {
        throw new Error(
          saveError?.message
            ? `transcript_persist_failed: ${saveError.message}`
            : "transcript_persist_failed",
        );
      }

      edgeLog("info", "edge.process-note", {
        event: "ok",
        noteId,
        status: updated.status,
        provider: result.provider,
        model: result.model,
        textLength: result.text.length,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        status: updated.status,
        provider: result.provider,
        model: result.model,
        textLength: result.text.length,
      });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "transcription_failed";
      const code = reason.split(":")[0]?.trim() || "transcription_failed";

      await ctx.supabase
        .from("notes")
        .update({
          status: "transcription_failed",
          last_error_code: code.slice(0, 80),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .eq("status", "transcribing");

      edgeLog("error", "edge.process-note", {
        event: "fail",
        code,
        reason,
        noteId,
        durationMs: Date.now() - started,
      });

      return Response.json(
        { ok: false, error: code, reason, status: "transcription_failed" },
        { status: 502 },
      );
    }
  }),
};
