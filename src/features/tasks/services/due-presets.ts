/**
 * Due-date presets for the Edit next step sheet (prototype Today / Tomorrow / Next week).
 * A due date is a local calendar day, stored as local noon, so the sheet, list labels
 * and task detail all read back the same day in any timezone.
 */

export type DuePreset = 'today' | 'tomorrow' | 'next_week';

export const DUE_PRESETS: { id: DuePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'next_week', label: 'Next week' },
];

/** Local calendar date as YYYY-MM-DD (en-CA style). */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dueDateKeyForPreset(preset: DuePreset, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
  if (preset === 'next_week') d.setDate(d.getDate() + 7);
  return localDateKey(d);
}

/**
 * Local date key (+ optional `HH:mm`) → due_at ISO. No time = local noon.
 * Null unless both are real (no Feb 30, no 25:00).
 */
export function dueAtFromLocalDateKey(key: string, time?: string | null): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  let hour = 12;
  let minute = 0;
  if (time) {
    const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
    if (!t) return null;
    hour = Number(t[1]);
    minute = Number(t[2]);
  }
  const date = new Date(year, month - 1, day, hour, minute);
  return date.getMonth() === month - 1 && date.getDate() === day ? date.toISOString() : null;
}

/** ISO due_at → local YYYY-MM-DD: the same calendar day `dueLabel` shows. */
export function localDateKeyFromDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt);
  return Number.isFinite(ms) ? localDateKey(new Date(ms)) : null;
}

/**
 * ISO due_at → local `HH:mm`, or null for a date-only due (local noon).
 * ponytail: a task due at exactly 12:00 reads as date-only; fix with a
 * `due_has_time` column if noon deadlines start to matter.
 */
export function localTimeKeyFromDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (d.getHours() === 12 && d.getMinutes() === 0) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
