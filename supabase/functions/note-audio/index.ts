import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeLog } from "../_shared/log.ts";
import { buildNoteAudioPath } from "../_shared/storage/note-audio-path.ts";

const MAX_BYTES = 10 * 1024 * 1024;
const NOTE_PUBLIC_COLUMNS =
  "id, title, audio_mime_type, audio_duration_seconds, transcript, edited_transcript, language, status, processing_attempts, last_error_code, created_at, updated_at";

/**
 * Authenticated audio proxy — client sends noteId only; storage keys stay server-side.
 *
 * - POST multipart (?action=upload): noteId, durationSeconds, file, optional mimeType
 * - POST JSON `{ "action": "download", "noteId" }` → raw audio bytes
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      edgeLog("error", "edge.note-audio", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing user claims",
      });
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    const actionParam = url.searchParams.get("action");

    if (isMultipart || actionParam === "upload") {
      return handleUpload(req, ctx, userId, started);
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      noteId?: string;
    };
    const action = body.action ?? actionParam ?? "download";
    if (action === "download") {
      return handleDownload(ctx, userId, body.noteId?.trim() ?? "", started);
    }

    edgeLog("error", "edge.note-audio", {
      event: "fail",
      code: "invalid_action",
      reason: `Unknown action ${action}`,
      durationMs: Date.now() - started,
    });
    return Response.json({ ok: false, error: "invalid_action" }, {
      status: 400,
    });
  }),
};

// deno-lint-ignore no-explicit-any
async function handleUpload(req: Request, ctx: any, userId: string, started: number) {
  const form = await req.formData();
  const noteId = String(form.get("noteId") ?? "").trim();
  const durationRaw = String(form.get("durationSeconds") ?? "");
  const durationSeconds = Number(durationRaw);
  const file = form.get("file");
  const mimeType =
    String(form.get("mimeType") ?? "").trim() ||
    (file instanceof File ? file.type : "") ||
    "audio/mp4";

  edgeLog("info", "edge.note-audio", {
    event: "start",
    op: "upload",
    noteId: noteId || null,
    mimeType,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
  });

  if (!noteId) {
    return fail(started, "upload", "note_id_required", "multipart noteId missing", noteId, 400);
  }
  if (
    !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
    durationSeconds > 60
  ) {
    return fail(
      started,
      "upload",
      "invalid_duration",
      `durationSeconds=${durationRaw}`,
      noteId,
      400,
    );
  }
  if (!(file instanceof File) || file.size <= 0) {
    return fail(
      started,
      "upload",
      "file_required",
      "multipart file missing or empty",
      noteId,
      400,
    );
  }
  if (file.size > MAX_BYTES) {
    return fail(
      started,
      "upload",
      "file_too_large",
      `size=${file.size}`,
      noteId,
      413,
    );
  }

  const { data: existing, error: loadError } = await ctx.supabase
    .from("notes")
    .select("id, status")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    return fail(started, "upload", "note_load_failed", loadError.message, noteId, 500);
  }
  if (!existing) {
    return fail(
      started,
      "upload",
      "note_not_found",
      "Note missing or not owned",
      noteId,
      404,
    );
  }
  if (!["draft", "upload_failed", "uploading"].includes(existing.status)) {
    return fail(
      started,
      "upload",
      "invalid_upload_status",
      `status=${existing.status}`,
      noteId,
      409,
    );
  }

  if (existing.status !== "uploading") {
    const { data: claimed, error: claimError } = await ctx.supabase
      .from("notes")
      .update({
        status: "uploading",
        last_error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("user_id", userId)
      .in("status", ["draft", "upload_failed"])
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) {
      return fail(
        started,
        "upload",
        "status_transition_lost",
        claimError?.message ?? "Could not move to uploading",
        noteId,
        409,
      );
    }
  }

  const extension = extensionForMime(mimeType);
  const audioPath = buildNoteAudioPath({ userId, noteId, extension });

  const { error: uploadError } = await ctx.supabase.storage
    .from("note-audio")
    .upload(audioPath, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    await ctx.supabase
      .from("notes")
      .update({
        status: "upload_failed",
        last_error_code: "storage_upload_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("user_id", userId)
      .eq("status", "uploading");

    return fail(
      started,
      "upload",
      "storage_upload_failed",
      uploadError.message,
      noteId,
      502,
    );
  }

  const { data: queued, error: queueError } = await ctx.supabase
    .from("notes")
    .update({
      status: "queued",
      audio_path: audioPath,
      audio_mime_type: mimeType,
      audio_duration_seconds: durationSeconds,
      last_error_code: null,
      title: "Voice note",
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("user_id", userId)
    .eq("status", "uploading")
    .select(NOTE_PUBLIC_COLUMNS)
    .maybeSingle();

  if (queueError || !queued) {
    return fail(
      started,
      "upload",
      "queue_persist_failed",
      queueError?.message ?? "Could not mark queued",
      noteId,
      500,
    );
  }

  edgeLog("info", "edge.note-audio", {
    event: "ok",
    op: "upload",
    noteId,
    status: queued.status,
    bytes: file.size,
    mimeType,
    durationMs: Date.now() - started,
  });

  return Response.json({ ok: true, note: queued });
}

// deno-lint-ignore no-explicit-any
async function handleDownload(ctx: any, userId: string, noteId: string, started: number) {
  edgeLog("info", "edge.note-audio", {
    event: "start",
    op: "download",
    noteId: noteId || null,
  });

  if (!noteId) {
    return fail(started, "download", "note_id_required", "noteId missing", noteId, 400);
  }

  const { data: existing, error: loadError } = await ctx.supabase
    .from("notes")
    .select("id, audio_path, audio_mime_type")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    return fail(started, "download", "note_load_failed", loadError.message, noteId, 500);
  }
  if (!existing) {
    return fail(
      started,
      "download",
      "note_not_found",
      "Note missing or not owned",
      noteId,
      404,
    );
  }
  if (!existing.audio_path) {
    return fail(started, "download", "audio_missing", "audio_path is null", noteId, 404);
  }

  const { data: fileData, error: downloadError } = await ctx.supabase.storage
    .from("note-audio")
    .download(existing.audio_path);

  if (downloadError || !fileData) {
    return fail(
      started,
      "download",
      "audio_download_failed",
      downloadError?.message ?? "empty body",
      noteId,
      502,
    );
  }

  const mime = existing.audio_mime_type ?? "audio/mp4";
  const bytes = await fileData.arrayBuffer();

  edgeLog("info", "edge.note-audio", {
    event: "ok",
    op: "download",
    noteId,
    mimeType: mime,
    bytes: bytes.byteLength,
    durationMs: Date.now() - started,
  });

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Note-Id": noteId,
    },
  });
}

function fail(
  started: number,
  op: string,
  code: string,
  reason: string,
  noteId: string,
  status: number,
) {
  edgeLog("error", "edge.note-audio", {
    event: "fail",
    op,
    code,
    reason,
    noteId: noteId || null,
    durationMs: Date.now() - started,
  });
  return Response.json({ ok: false, error: code, reason }, { status });
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "m4a";
}
