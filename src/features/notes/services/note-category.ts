export const NOTE_CATEGORIES = ['Work', 'Ideas', 'Personal'] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const DEFAULT_NOTE_CATEGORY: NoteCategory = 'Ideas';

export const NOTE_CATEGORY_FILTERS = [
  'All notes',
  ...NOTE_CATEGORIES,
] as const;
export type NoteCategoryFilter = (typeof NOTE_CATEGORY_FILTERS)[number];

export function isNoteCategory(value: string): value is NoteCategory {
  return (NOTE_CATEGORIES as readonly string[]).includes(value);
}

/** Normalize unknown/legacy values to a valid category (default Ideas). */
export function normalizeNoteCategory(value: string | null | undefined): NoteCategory {
  if (value && isNoteCategory(value)) return value;
  return DEFAULT_NOTE_CATEGORY;
}

/** Filter notes by chip selection. "All notes" keeps every row. */
export function noteMatchesCategoryFilter(
  note: { category: string },
  filter: NoteCategoryFilter,
): boolean {
  if (filter === 'All notes') return true;
  return normalizeNoteCategory(note.category) === filter;
}

const CARD_TONES = ['lavender', 'lime', 'muted'] as const;
export type NoteCardTone = (typeof CARD_TONES)[number];

/** Stable pastel rotation for note cards (prototype lavender / lime / muted). */
export function noteCardTone(index: number): NoteCardTone {
  return CARD_TONES[((index % CARD_TONES.length) + CARD_TONES.length) % CARD_TONES.length]!;
}

/** Two-letter mark from a note title for card watermark / avatar. */
export function noteTitleInitials(title: string | null | undefined): string {
  const parts = (title?.trim() || 'Note').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0] ?? 'N').slice(0, 2).toUpperCase();
}

/** Whole seconds for note audio length (max clip is 60s); em dash when missing. */
export function formatNoteDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  return `${Math.floor(seconds)}s`;
}

function noteDayDiff(iso: string, nowMs: number) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const startToday = new Date(nowMs);
  startToday.setHours(0, 0, 0, 0);
  const startThen = new Date(then);
  startThen.setHours(0, 0, 0, 0);
  return Math.round(
    (startThen.getTime() - startToday.getTime()) / 86_400_000,
  );
}

/** Relative-ish label for note timestamps (local display). */
export function formatNoteTime(iso: string, nowMs = Date.now()): string {
  const dayDiff = noteDayDiff(iso, nowMs);
  if (dayDiff == null) return '';
  const time = new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === -1) return `Yesterday · ${time}`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Compact time for note-card stats — time today, Yday, or short date. */
export function formatNoteTimeShort(iso: string, nowMs = Date.now()): string {
  const dayDiff = noteDayDiff(iso, nowMs);
  if (dayDiff == null) return '—';
  if (dayDiff === 0) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (dayDiff === -1) return 'Yday';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
