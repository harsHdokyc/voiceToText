/** Private note-audio retention. Notes, transcripts, and tasks are not part of this. */

export const AUDIO_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

/** One cron run. Safe to call again; leftover rows stay eligible. */
export const AUDIO_PURGE_BATCH_LIMIT = 40;

export type AudioPurgeCandidate = {
  audio_path: string | null;
  audio_purged_at: string | null;
  created_at: string;
  /** Ignored. The 3-day window is the retry window for every status. */
  status?: string;
  /** Ignored. A missing transcript does not keep the file. */
  transcript?: string | null;
};

export function hasStoredTranscript(
  transcript: string | null | undefined,
): boolean {
  return typeof transcript === "string" && transcript.trim().length > 0;
}

export function audioRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - AUDIO_RETENTION_MS);
}

function isStamped(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * True when the storage object may be removed.
 * `created_at` is the recording clock (the note row is created at capture).
 * Status and transcript do not matter: 3 days is the whole retry window.
 */
export function isAudioPurgeEligible(
  note: AudioPurgeCandidate,
  now: Date,
): boolean {
  if (!note.audio_path?.trim()) return false;
  if (isStamped(note.audio_purged_at)) return false;
  const createdMs = Date.parse(note.created_at);
  if (!Number.isFinite(createdMs)) return false;
  return createdMs <= now.getTime() - AUDIO_RETENTION_MS;
}

export type OrphanAudioObject = {
  name: string;
  created_at: string;
  /** A recent replace keeps the object even when created_at is old. */
  updated_at?: string | null;
  referenced_by_note: boolean;
};

/**
 * A bucket object with no `notes.audio_path` and an upload time at least 3 days ago.
 * Younger objects stay: an upload can exist for a moment before the note row points at it.
 */
export function isOrphanAudioDeletable(
  object: OrphanAudioObject,
  now: Date,
): boolean {
  const name = object.name?.trim() ?? "";
  if (!name || name.endsWith("/")) return false;
  if (object.referenced_by_note) return false;
  const cutoff = now.getTime() - AUDIO_RETENTION_MS;
  const createdMs = Date.parse(object.created_at);
  const updatedMs = Date.parse(object.updated_at ?? "");
  if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs)) return false;
  return createdMs <= cutoff && updatedMs <= cutoff;
}

/**
 * Statuses `extract-note` may claim when a transcript is already stored.
 * Transcription retry keeps the file's statuses while `audio_path` is still set,
 * so a direct extract call cannot skip speech-to-text.
 * After the file is gone, `queued` and `transcription_failed` may re-extract.
 */
export function reextractClaimStatuses(note: {
  status: string;
  transcript: string | null;
  audio_path: string | null;
  audio_purged_at?: string | null;
}): string[] | null {
  if (!hasStoredTranscript(note.transcript)) return null;
  if (note.status === "extraction_failed" || note.status === "extracting") {
    return ["extraction_failed", "extracting"];
  }
  const audioGone = !note.audio_path?.trim() || isStamped(note.audio_purged_at);
  if (
    audioGone &&
    (note.status === "transcription_failed" || note.status === "queued")
  ) {
    return ["transcription_failed", "queued"];
  }
  return null;
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
