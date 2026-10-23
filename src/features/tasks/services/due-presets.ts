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

/** Local date key → due_at ISO at local noon. Null unless it is a real calendar date. */
export function dueAtFromLocalDateKey(key: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getMonth() === month - 1 && date.getDate() === day ? date.toISOString() : null;
}

/** ISO due_at → local YYYY-MM-DD: the same calendar day `dueLabel` shows. */
export function localDateKeyFromDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt);
  return Number.isFinite(ms) ? localDateKey(new Date(ms)) : null;
}
