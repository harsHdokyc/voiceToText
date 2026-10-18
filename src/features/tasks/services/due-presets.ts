/**
 * Due-date presets for the Edit next step sheet (prototype Today / Tomorrow / Next week).
 * Stored as local YYYY-MM-DD → noon UTC ISO (same convention as task detail).
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

/** Map local date key → due_at ISO (noon UTC). */
export function dueAtFromLocalDateKey(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error('Invalid due date');
  }
  return new Date(`${key}T12:00:00.000Z`).toISOString();
}

/** ISO due_at → local YYYY-MM-DD for chip selection (UTC date slice). */
export function localDateKeyFromDueAt(dueAt: string | null | undefined): string | null {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt);
  if (!Number.isFinite(ms)) return null;
  return dueAt.slice(0, 10);
}
