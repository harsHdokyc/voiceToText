/** Phase 7: daily process-note cap per user (content-free quota). */
export const DAILY_PROCESS_NOTE_LIMIT = 40;

export type ProcessNoteQuota =
  | { ok: true; usageCount: number }
  | { ok: false; code: "rate_limited"; usageCount: number }
  | { ok: false; code: "usage_count_failed"; reason: string };

/**
 * Decide whether process-note may run.
 * Fail closed: a missing/errored count never bypasses the cap.
 */
export function decideProcessNoteQuota(
  usageCount: number | null | undefined,
  usageErrorMessage: string | null | undefined,
  limit: number = DAILY_PROCESS_NOTE_LIMIT,
): ProcessNoteQuota {
  if (usageErrorMessage) {
    return {
      ok: false,
      code: "usage_count_failed",
      reason: usageErrorMessage.slice(0, 200),
    };
  }
  if (typeof usageCount !== "number" || !Number.isFinite(usageCount)) {
    return {
      ok: false,
      code: "usage_count_failed",
      reason: "Usage count missing",
    };
  }
  if (usageCount >= limit) {
    return { ok: false, code: "rate_limited", usageCount };
  }
  return { ok: true, usageCount };
}
