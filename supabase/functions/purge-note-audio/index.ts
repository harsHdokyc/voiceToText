import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { edgeLog } from "../_shared/log.ts";
import {
  AUDIO_PURGE_BATCH_LIMIT,
  AUDIO_PURGE_STATUSES,
  audioRetentionCutoff,
  isAudioPurgeEligible,
  storageDeleteConfirmed,
  type AudioPurgeCandidate,
} from "../_shared/storage/audio-retention.ts";

type CandidateRow = AudioPurgeCandidate & { id: string };

const CANDIDATE_COLUMNS =
  "id, audio_path, status, transcript, created_at, audio_purged_at";

/**
 * Cron purge of private `note-audio` objects 3 days after the note was recorded.
 * Auth: header x-cron-secret === CRON_SECRET (same secret as dispatch-reminders).
 * Deletes storage objects only. Clears `audio_path` and sets `audio_purged_at`
 * after the storage API succeeds. Idempotent.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
    const provided = req.headers.get("x-cron-secret")?.trim();
    if (!cronSecret || !provided || provided !== cronSecret) {
      edgeLog("error", "edge.purge-note-audio", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing or invalid x-cron-secret",
      });
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SB_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      edgeLog("error", "edge.purge-note-audio", {
        event: "fail",
        code: "misconfigured",
        reason: "Missing SUPABASE_URL or service role key",
      });
      return Response.json({ ok: false, error: "misconfigured" }, {
        status: 500,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();
    edgeLog("info", "edge.purge-note-audio", { event: "start" });

    try {
      const cutoff = audioRetentionCutoff(now).toISOString();
      // ponytail: whitespace-only transcripts still match `.neq("")` and are
      // skipped in JS, so a backlog of them can fill this batch. Upgrade path:
      // length(btrim(transcript)) > 0 in SQL if that shows up.
      const { data, error } = await admin
        .from("notes")
        .select(CANDIDATE_COLUMNS)
        .not("audio_path", "is", null)
        .is("audio_purged_at", null)
        .lte("created_at", cutoff)
        .in("status", [...AUDIO_PURGE_STATUSES])
        .not("transcript", "is", null)
        .neq("transcript", "")
        .order("created_at", { ascending: true })
        .limit(AUDIO_PURGE_BATCH_LIMIT);

      if (error) {
        throw new Error(`purge_query_failed: ${error.message}`);
      }

      const rows = (data ?? []) as CandidateRow[];
      let purged = 0;
      let failed = 0;
      let skipped = 0;

      for (const row of rows) {
        const result = await purgeOne(admin, row, now);
        if (result === "purged") purged += 1;
        else if (result === "failed") failed += 1;
        else skipped += 1;
      }

      edgeLog(failed > 0 ? "warn" : "info", "edge.purge-note-audio", {
        event: failed > 0 ? "partial" : "ok",
        scanned: rows.length,
        purged,
        failed,
        skipped,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        scanned: rows.length,
        purged,
        failed,
        skipped,
      });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "purge_failed";
      const code = reason.split(":")[0]?.trim() || "purge_failed";
      edgeLog("error", "edge.purge-note-audio", {
        event: "fail",
        code,
        reason,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: code, reason }, { status: 502 });
    }
  },
};

async function purgeOne(
  admin: ReturnType<typeof createClient>,
  row: CandidateRow,
  now: Date,
): Promise<"purged" | "failed" | "skipped"> {
  if (!isAudioPurgeEligible(row, now)) return "skipped";

  const path = row.audio_path?.trim();
  if (!path) return "skipped";

  const { data: removed, error: storageError } = await admin.storage
    .from("note-audio")
    .remove([path]);

  if (!storageDeleteConfirmed(storageError, removed, path)) {
    edgeLog("warn", "edge.purge-note-audio", {
      event: "storage_cleanup_failed",
      code: "storage_delete_failed",
      reason: (storageError?.message ?? "storage remove was not confirmed")
        .slice(0, 200),
      noteId: row.id,
    });
    return "failed";
  }

  const purgedAt = now.toISOString();
  const { data: updated, error: updateError } = await admin
    .from("notes")
    .update({
      audio_path: null,
      audio_purged_at: purgedAt,
      updated_at: purgedAt,
    })
    .eq("id", row.id)
    .eq("audio_path", path)
    .is("audio_purged_at", null)
    .in("status", [...AUDIO_PURGE_STATUSES])
    .select("id");

  if (updateError) {
    edgeLog("warn", "edge.purge-note-audio", {
      event: "purge_mark_failed",
      code: "purge_mark_failed",
      reason: updateError.message.slice(0, 200),
      noteId: row.id,
    });
    return "failed";
  }

  if (!updated?.length) {
    edgeLog("warn", "edge.purge-note-audio", {
      event: "purge_mark_lost",
      code: "purge_mark_lost",
      reason: "Storage object removed but the note row no longer matched",
      noteId: row.id,
    });
    return "failed";
  }

  return "purged";
}
