import "@supabase/functions-js/edge-runtime.d.ts";
import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import {
  hasCronSecret,
  serviceClient,
  type ServiceClient,
} from "../_shared/service-role.ts";
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

const SCOPE = "edge.purge-note-audio";
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

    const r = edgeRequest(SCOPE);
    if (!hasCronSecret(req)) {
      return r.fail(401, "unauthorized", "Missing or invalid x-cron-secret");
    }

    let admin: ServiceClient;
    try {
      admin = serviceClient();
    } catch (error) {
      return r.fail(500, "misconfigured", (error as Error).message);
    }

    const now = new Date();
    edgeLog("info", SCOPE, { event: "start" });

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

      edgeLog(anyFailed ? "warn" : "info", SCOPE, {
        event: anyFailed ? "partial" : "ok",
        scanned: rows.length,
        purged,
        failed,
        skipped,
        orphansScanned: orphans.scanned,
        orphansRemoved: orphans.removed,
        orphansFailed: orphans.failed,
        durationMs: r.ms(),
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
      return r.failFrom(error, "purge_failed");
    }
  },
};

async function purgeOne(
  admin: ServiceClient,
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
    edgeLog("warn", SCOPE, {
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
    edgeLog("warn", SCOPE, {
      event: "purge_mark_failed",
      code: "purge_mark_failed",
      reason: updateError.message.slice(0, 200),
      noteId: row.id,
    });
    return "failed";
  }

  if (!updated?.length) {
    edgeLog("warn", SCOPE, {
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
  admin: ServiceClient,
  cutoff: string,
  now: Date,
): Promise<{ scanned: number; removed: number; failed: number }> {
  const { data, error } = await admin.rpc("list_orphan_note_audio", {
    p_cutoff: cutoff,
    p_limit: AUDIO_PURGE_BATCH_LIMIT,
  });
  if (error) {
    edgeLog("warn", SCOPE, {
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
      edgeLog("warn", SCOPE, {
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
