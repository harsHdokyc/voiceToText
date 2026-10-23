import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { type EdgeRequest, edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import {
  noteLifecycle,
  UPLOAD_CLAIMABLE,
} from "../_shared/notes/note-lifecycle.ts";
import { buildNoteAudioPath } from "../_shared/storage/note-audio-path.ts";

const SCOPE = "edge.note-audio";
const MAX_BYTES = 10 * 1024 * 1024;
const NOTE_PUBLIC_COLUMNS =
  "id, title, audio_mime_type, audio_duration_seconds, transcript, edited_transcript, language, status, processing_attempts, last_error_code, audio_purged_at, created_at, updated_at";

/**
 * Authenticated audio proxy — client sends noteId only; storage keys stay server-side.
 *
 * - POST multipart (?action=upload): noteId, durationSeconds, file, optional mimeType
 * - POST JSON `{ "action": "download", "noteId" }` → raw audio bytes
 * - GET ?action=download&noteId=… → same bytes (native file download for playback)
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

    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    const actionParam = url.searchParams.get("action");

    if (isMultipart || actionParam === "upload") {
      return handleUpload(req, ctx, userId, r);
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      noteId?: string;
    };
    const action = body.action ?? actionParam ?? "download";
    if (action === "download") {
      const noteId = body.noteId ?? url.searchParams.get("noteId") ?? "";
      return handleDownload(ctx, userId, noteId.trim(), r);
    }

    return r.fail(400, "invalid_action", `Unknown action ${action}`);
  }),
};

async function handleUpload(
  req: Request,
  // deno-lint-ignore no-explicit-any
  ctx: any,
  userId: string,
  r: EdgeRequest,
) {
  const form = await req.formData();
  const noteId = String(form.get("noteId") ?? "").trim();
  const durationRaw = String(form.get("durationSeconds") ?? "");
  const durationSeconds = Number(durationRaw);
  const file = form.get("file");
  const mimeType = String(form.get("mimeType") ?? "").trim() ||
    (file instanceof File ? file.type : "") ||
    "audio/mp4";

  edgeLog("info", SCOPE, {
    event: "start",
    op: "upload",
    noteId: noteId || null,
    mimeType,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
  });

  if (!noteId) {
    return r.fail(400, "note_id_required", "multipart noteId missing", {
      op: "upload",
      noteId: noteId || null,
    });
  }
  if (
    !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
    durationSeconds > 60
  ) {
    return r.fail(400, "invalid_duration", `durationSeconds=${durationRaw}`, {
      op: "upload",
      noteId: noteId || null,
    });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return r.fail(400, "file_required", "multipart file missing or empty", {
      op: "upload",
      noteId: noteId || null,
    });
  }
  if (file.size > MAX_BYTES) {
    return r.fail(413, "file_too_large", `size=${file.size}`, {
      op: "upload",
      noteId: noteId || null,
    });
  }

  const { data: existing, error: loadError } = await ctx.supabase
    .from("notes")
    .select("id, status")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    return r.fail(500, "note_load_failed", loadError.message, {
      op: "upload",
      noteId: noteId || null,
    });
  }
  if (!existing) {
    return r.fail(404, "note_not_found", "Note missing or not owned", {
      op: "upload",
      noteId: noteId || null,
    });
  }
  if (![...UPLOAD_CLAIMABLE, "uploading"].includes(existing.status)) {
    return r.fail(409, "invalid_upload_status", `status=${existing.status}`, {
      op: "upload",
      noteId: noteId || null,
    });
  }

  const note = noteLifecycle(ctx.supabase, noteId, userId);
  if (existing.status !== "uploading") {
    const { row: claimed, error: claimError } = await note.claim(
      "upload",
      UPLOAD_CLAIMABLE,
    );
    if (claimError || !claimed) {
      return r.fail(
        409,
        "status_transition_lost",
        claimError ?? "Could not move to uploading",
        { op: "upload", noteId: noteId || null },
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
    await note.fail("upload", "storage_upload_failed");

    return r.fail(502, "storage_upload_failed", uploadError.message, {
      op: "upload",
      noteId: noteId || null,
    });
  }

  const { row: queued, error: queueError } = await note.complete(
    "upload",
    "queued",
    {
      audio_path: audioPath,
      audio_mime_type: mimeType,
      audio_duration_seconds: durationSeconds,
    },
    NOTE_PUBLIC_COLUMNS,
  );

  if (queueError || !queued) {
    return r.fail(
      500,
      "queue_persist_failed",
      queueError ?? "Could not mark queued",
      { op: "upload", noteId: noteId || null },
    );
  }

  edgeLog("info", SCOPE, {
    event: "ok",
    op: "upload",
    noteId,
    status: queued.status,
    bytes: file.size,
    mimeType,
    durationMs: r.ms(),
  });

  return Response.json({ ok: true, note: queued });
}

async function handleDownload(
  // deno-lint-ignore no-explicit-any
  ctx: any,
  userId: string,
  noteId: string,
  r: EdgeRequest,
) {
  edgeLog("info", SCOPE, {
    event: "start",
    op: "download",
    noteId: noteId || null,
  });

  if (!noteId) {
    return r.fail(400, "note_id_required", "noteId missing", {
      op: "download",
      noteId: noteId || null,
    });
  }

  const { data: existing, error: loadError } = await ctx.supabase
    .from("notes")
    .select("id, audio_path, audio_mime_type, audio_purged_at")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError) {
    return r.fail(500, "note_load_failed", loadError.message, {
      op: "download",
      noteId: noteId || null,
    });
  }
  if (!existing) {
    return r.fail(404, "note_not_found", "Note missing or not owned", {
      op: "download",
      noteId: noteId || null,
    });
  }
  if (!existing.audio_path) {
    if (existing.audio_purged_at) {
      return r.fail(
        404,
        "audio_purged",
        "Audio deleted after the 3 day retention window",
        { op: "download", noteId: noteId || null },
      );
    }
    return r.fail(404, "audio_missing", "audio_path is null", {
      op: "download",
      noteId: noteId || null,
    });
  }

  const { data: fileData, error: downloadError } = await ctx.supabase.storage
    .from("note-audio")
    .download(existing.audio_path);

  if (downloadError || !fileData) {
    return r.fail(
      502,
      "audio_download_failed",
      downloadError?.message ?? "empty body",
      { op: "download", noteId: noteId || null },
    );
  }

  const mime = existing.audio_mime_type ?? "audio/mp4";
  const bytes = await fileData.arrayBuffer();

  edgeLog("info", SCOPE, {
    event: "ok",
    op: "download",
    noteId,
    mimeType: mime,
    bytes: bytes.byteLength,
    durationMs: r.ms(),
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

function extensionForMime(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "m4a";
}
