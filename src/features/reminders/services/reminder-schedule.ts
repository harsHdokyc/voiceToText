/**
 * Pure reminder helpers — UTC schedule + idempotency keys.
 */

export function buildReminderIdempotencyKey(taskId: string, scheduledForIso: string) {
  return `task:${taskId}:at:${scheduledForIso}`;
}

/** Parse local/ISO input to UTC ISO; reject past times (30s grace). */
export function assertReminderSchedule(scheduledFor: string, now = new Date()) {
  const ms = Date.parse(scheduledFor);
  if (!Number.isFinite(ms)) {
    throw new Error('Invalid reminder time');
  }
  if (ms < now.getTime() - 30_000) {
    throw new Error('Reminder time must be in the future');
  }
  return new Date(ms).toISOString();
}

/** Hours from now → UTC ISO (quick schedule buttons). */
export function reminderAtHoursFromNow(hours: number, now = new Date()) {
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('Hours must be positive');
  }
  return new Date(now.getTime() + hours * 3600_000).toISOString();
}

export const MAX_REMINDER_ATTEMPTS = 5;
