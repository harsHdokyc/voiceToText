/** Private note-audio retention. Notes, transcripts, and tasks are not part of this. */

export const AUDIO_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

/** One cron run. Safe to call again; leftover rows stay eligible. */
export const AUDIO_PURGE_BATCH_LIMIT = 40;

/**
 * Terminal statuses whose transcript no longer needs the file.
 * `transcription_failed` and in-progress statuses are excluded: process-note
 * still has to read the object to retry speech-to-text.
 */
export const AUDIO_PURGE_STATUSES = ["review_ready", "extraction_failed"] as const;

export type AudioPurgeCandidate = {
  audio_path: string | null;
  audio_purged_at: string | null;
  created_at: string;
  status: string;
  transcript: string | null;
};

const PURGE_STATUS_SET = new Set<string>(AUDIO_PURGE_STATUSES);

export function hasStoredTranscript(
  transcript: string | null | undefined,
): boolean {
  return typeof transcript === "string" && transcript.trim().length > 0;
}

export function audioRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - AUDIO_RETENTION_MS);
}

/**
 * True when the storage object may be removed.
 * `created_at` is the recording clock (the note row is created at capture).
 * Requires the original transcript so extraction_failed can retry without audio.
 */
export function isAudioPurgeEligible(
  note: AudioPurgeCandidate,
  now: Date,
): boolean {
  if (!note.audio_path?.trim()) return false;
  if (typeof note.audio_purged_at === "string" && note.audio_purged_at.trim()) {
    return false;
  }
  if (!hasStoredTranscript(note.transcript)) return false;
  if (!PURGE_STATUS_SET.has(note.status)) return false;
  const createdMs = Date.parse(note.created_at);
  if (!Number.isFinite(createdMs)) return false;
  return createdMs <= now.getTime() - AUDIO_RETENTION_MS;
}

export type StorageRemoveError = {
  message?: string;
  status?: number;
  statusCode?: number | string;
} | null;

function storageNameMatches(returned: string, path: string): boolean {
  if (returned === path) return true;
  const base = path.split("/").pop();
  if (base && returned === base) return true;
  return returned.endsWith(`/${path}`);
}

/**
 * Storage API success, including a file that is already gone (rerun).
 * ponytail: a null error with an empty `data` array is treated as "already
 * absent". If the API ever returns that shape while the object is still there,
 * the note pointer is cleared and the file is orphaned. Upgrade path: require
 * a returned name match, and list the object when the array is empty.
 */
export function storageDeleteConfirmed(
  error: StorageRemoveError,
  deleted: { name?: string | null }[] | null | undefined,
  path: string,
): boolean {
  if (!path.trim()) return false;
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    const status = Number(error.status ?? error.statusCode);
    if (status === 404) return true;
    return msg.includes("not found") || msg.includes("does not exist");
  }
  const rows = deleted ?? [];
  if (rows.length === 0) return true;
  return rows.some((row) =>
    typeof row.name === "string" && storageNameMatches(row.name, path)
  );
}
