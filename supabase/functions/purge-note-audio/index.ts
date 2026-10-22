import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { edgeLog } from "../_shared/log.ts";
import {
  AUDIO_PURGE_BATCH_LIMIT,
  audioRetentionCutoff,
  isAudioPurgeEligible,
  isOrphanAudioDeletable,
  storageDeleteConfirmed,
  type AudioPurgeCandidate,
} from "../_shared/storage/audio-retention.ts";

type CandidateRow = AudioPurgeCandidate & { id: string };

type OrphanRow = {
  object_name: string;
  created_at: string;
  updated_at: string | null;
};

const CANDIDATE_COLUMNS = "id, audio_path, created_at, audio_purged_at";

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
      const { data, error } = await admin
        .from("notes")
        .select(CANDIDATE_COLUMNS)
        .not("audio_path", "is", null)
        .is("audio_purged_at", null)
        .lte("created_at", cutoff)
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

      const orphans = await purgeOrphans(admin, cutoff, now);
      const anyFailed = failed > 0 || orphans.failed > 0;

      edgeLog(anyFailed ? "warn" : "info", "edge.purge-note-audio", {
        event: anyFailed ? "partial" : "ok",
        scanned: rows.length,
        purged,
        failed,
        skipped,
        orphansScanned: orphans.scanned,
        orphansRemoved: orphans.removed,
        orphansFailed: orphans.failed,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        scanned: rows.length,
        purged,
        failed,
        skipped,
        orphansScanned: orphans.scanned,
        orphansRemoved: orphans.removed,
        orphansFailed: orphans.failed,
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

async function purgeOrphans(
  admin: ReturnType<typeof createClient>,
  cutoff: string,
  now: Date,
): Promise<{ scanned: number; removed: number; failed: number }> {
  const { data, error } = await admin.rpc("list_orphan_note_audio", {
    p_cutoff: cutoff,
    p_limit: AUDIO_PURGE_BATCH_LIMIT,
  });
  if (error) {
    edgeLog("warn", "edge.purge-note-audio", {
      event: "orphan_query_failed",
      code: "orphan_query_failed",
      reason: error.message.slice(0, 200),
    });
    return { scanned: 0, removed: 0, failed: 1 };
  }

  const rows = (data ?? []) as OrphanRow[];
  let removed = 0;
  let failed = 0;
  for (const row of rows) {
    const name = row.object_name?.trim() ?? "";
    if (
      !isOrphanAudioDeletable(
        {
          name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          referenced_by_note: false,
        },
        now,
      )
    ) {
      continue;
    }
    const { data: gone, error: storageError } = await admin.storage
      .from("note-audio")
      .remove([name]);
    if (!storageDeleteConfirmed(storageError, gone, name)) {
      edgeLog("warn", "edge.purge-note-audio", {
        event: "orphan_delete_failed",
        code: "storage_delete_failed",
        reason: (storageError?.message ?? "storage remove was not confirmed")
          .slice(0, 200),
      });
      failed += 1;
      continue;
    }
    removed += 1;
  }
  return { scanned: rows.length, removed, failed };
}
