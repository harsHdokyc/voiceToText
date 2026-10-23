/**
 * Note status machine for the Edge pipeline. Every write is a conditional
 * update on the expected status, so a double tap or a parallel call loses the
 * race instead of double-billing or overwriting newer state.
 *
 *   draft | upload_failed  -> uploading    -> queued       (note-audio)
 *   queued | transcription_failed -> transcribing -> extracting (process-note)
 *   <reextractClaimStatuses> -> extracting -> review_ready (extract-note)
 *   any working status -> its *_failed status on error
 */

export const NOTE_STAGES = {
  upload: { working: "uploading", failed: "upload_failed" },
  transcribe: { working: "transcribing", failed: "transcription_failed" },
  extract: { working: "extracting", failed: "extraction_failed" },
} as const;

export type NoteStage = keyof typeof NOTE_STAGES;

export const UPLOAD_CLAIMABLE = ["draft", "upload_failed"];
export const TRANSCRIBE_CLAIMABLE = ["queued", "transcription_failed"];

/** Default stale window for wall-clock-killed `extracting` notes. */
export const STUCK_EXTRACTING_MS = 3 * 60 * 1000;

/** Pure: true when status is extracting and updatedAt is older than staleMs. */
export function isStuckExtracting(
  status: string | null | undefined,
  updatedAt: string | null | undefined,
  nowMs: number = Date.now(),
  staleMs: number = STUCK_EXTRACTING_MS,
): boolean {
  if (status !== "extracting" || !updatedAt) return false;
  const updatedMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedMs)) return false;
  return updatedMs < nowMs - staleMs;
}

type Row = Record<string, unknown>;

/**
 * Transitions for one owned note. `db` is a Supabase client (user-scoped, so
 * RLS still applies). Each method returns the updated row, or null when the
 * note was not in the expected status (lost race / wrong state).
 */
export function noteLifecycle(
  // deno-lint-ignore no-explicit-any
  db: any,
  noteId: string,
  userId: string,
  nowMs: () => number = Date.now,
) {
  async function transition(
    from: readonly string[],
    patch: Row,
    columns: string,
  ): Promise<{ row: Row | null; error: string | null }> {
    const { data, error } = await db
      .from("notes")
      .update({ ...patch, updated_at: new Date(nowMs()).toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId)
      .in("status", from)
      .select(columns)
      .maybeSingle();
    return { row: data ?? null, error: error?.message ?? null };
  }

  return {
    /** from-statuses -> stage working status; clears last_error_code. */
    claim(stage: NoteStage, from: readonly string[], patch: Row = {}, columns = "id, status") {
      return transition(
        from,
        { ...patch, status: NOTE_STAGES[stage].working, last_error_code: null },
        columns,
      );
    },

    /** stage working status -> next status. */
    complete(stage: NoteStage, next: string, patch: Row = {}, columns = "id, status") {
      return transition(
        [NOTE_STAGES[stage].working],
        { ...patch, status: next, last_error_code: null },
        columns,
      );
    },

    /** stage working status -> stage failed status with a stable code. */
    fail(stage: NoteStage, code: string) {
      return transition(
        [NOTE_STAGES[stage].working],
        { status: NOTE_STAGES[stage].failed, last_error_code: code.slice(0, 80) },
        "id, status",
      );
    },

    /** Flip a stale `extracting` (wall-clock kill) to `extraction_failed`. */
    async reclaimStuckExtracting(): Promise<boolean> {
      const { data: note } = await db
        .from("notes")
        .select("status, updated_at")
        .eq("id", noteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!isStuckExtracting(note?.status, note?.updated_at, nowMs())) {
        return false;
      }
      const { row } = await transition(
        ["extracting"],
        { status: "extraction_failed", last_error_code: "stuck_extracting" },
        "id, status",
      );
      return row !== null;
    },
  };
}
