import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NOTE_CATEGORY,
  formatNoteDuration,
  formatNoteTime,
  formatNoteTimeShort,
  isNoteCategory,
  noteCardTone,
  noteGridLayout,
  noteGridRows,
  noteMatchesCategoryFilter,
  noteTitleInitials,
  normalizeNoteCategory,
} from '@/features/notes/services/note-category';

afterEach(() => vi.useRealTimers());

describe('normalizeNoteCategory', () => {
  it('keeps valid categories and defaults the rest to Ideas', () => {
    expect(normalizeNoteCategory('Work')).toBe('Work');
    expect(normalizeNoteCategory('Ideas')).toBe('Ideas');
    expect(normalizeNoteCategory('Personal')).toBe('Personal');
    expect(normalizeNoteCategory(null)).toBe(DEFAULT_NOTE_CATEGORY);
    expect(normalizeNoteCategory('Other')).toBe('Ideas');
  });
});

describe('isNoteCategory', () => {
  it('accepts only Work Ideas Personal', () => {
    expect(isNoteCategory('Work')).toBe(true);
    expect(isNoteCategory('Ideas')).toBe(true);
    expect(isNoteCategory('junk')).toBe(false);
  });
});

describe('noteMatchesCategoryFilter', () => {
  it('passes all notes for All notes and matches one category otherwise', () => {
    const work = { category: 'Work' };
    const ideas = { category: 'Ideas' };
    expect(noteMatchesCategoryFilter(work, 'All notes')).toBe(true);
    expect(noteMatchesCategoryFilter(ideas, 'All notes')).toBe(true);
    expect(noteMatchesCategoryFilter(work, 'Work')).toBe(true);
    expect(noteMatchesCategoryFilter(work, 'Ideas')).toBe(false);
    expect(noteMatchesCategoryFilter({ category: 'legacy' }, 'Ideas')).toBe(
      true,
    );
  });
});

describe('noteCardTone', () => {
  it('rotates lavender lime muted', () => {
    expect(noteCardTone(0)).toBe('lavender');
    expect(noteCardTone(1)).toBe('lime');
    expect(noteCardTone(2)).toBe('muted');
    expect(noteCardTone(3)).toBe('lavender');
  });
});

describe('noteGridLayout', () => {
  it('uses one full-width column on phones', () => {
    expect(noteGridLayout(335, 16)).toEqual({ cols: 1, cardWidth: 335 });
    expect(noteGridLayout(280, 16)).toEqual({ cols: 1, cardWidth: 280 });
  });

  it('keeps one column on tablet once the sidebar eats the width', () => {
    expect(noteGridLayout(448, 16)).toEqual({ cols: 1, cardWidth: 448 });
  });

  it('switches to two columns once two 300px cards fit', () => {
    expect(noteGridLayout(616, 16)).toEqual({ cols: 2, cardWidth: 300 });
    expect(noteGridLayout(704, 16)).toEqual({ cols: 2, cardWidth: 344 });
  });

  it('uses three columns on a desktop grid beside the sidebar', () => {
    expect(noteGridLayout(1100, 16)).toEqual({ cols: 3, cardWidth: 356 });
  });

  it('caps at three columns on very wide grids', () => {
    expect(noteGridLayout(2000, 16).cols).toBe(3);
  });

  it('returns no width before the grid has been measured', () => {
    expect(noteGridLayout(0, 16)).toEqual({ cols: 1, cardWidth: 0 });
    expect(noteGridLayout(Number.NaN, 16)).toEqual({ cols: 1, cardWidth: 0 });
  });
});

describe('noteGridRows', () => {
  it('fills full rows and leaves the remainder in a short last row', () => {
    expect(noteGridRows(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('puts every item on its own row for one column', () => {
    expect(noteGridRows(['a', 'b'], 1)).toEqual([['a'], ['b']]);
  });

  it('returns no rows for no items and treats bad column counts as 1', () => {
    expect(noteGridRows([], 3)).toEqual([]);
    expect(noteGridRows(['a', 'b'], 0)).toEqual([['a'], ['b']]);
    expect(noteGridRows(['a', 'b'], Number.NaN)).toEqual([['a'], ['b']]);
  });
});

describe('formatNoteTime', () => {
  it('labels today and yesterday relative to frozen now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 15, 0, 0));
    expect(
      formatNoteTime(new Date(2026, 9, 10, 8, 42, 0).toISOString()),
    ).toMatch(/^Today · /);
    expect(
      formatNoteTime(new Date(2026, 9, 9, 18, 15, 0).toISOString()),
    ).toMatch(/^Yesterday · /);
    expect(
      formatNoteTime(new Date(2026, 9, 1, 12, 0, 0).toISOString()),
    ).not.toMatch(/Today|Yesterday/);
  });
});

describe('formatNoteTimeShort', () => {
  it('uses time today, Yday yesterday, and short date otherwise', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 15, 0, 0));
    expect(
      formatNoteTimeShort(new Date(2026, 9, 10, 8, 42, 0).toISOString()),
    ).toMatch(/\d/);
    expect(
      formatNoteTimeShort(new Date(2026, 9, 10, 8, 42, 0).toISOString()),
    ).not.toMatch(/Today|Yesterday|^0/);
    expect(
      formatNoteTimeShort(new Date(2026, 9, 9, 18, 15, 0).toISOString()),
    ).toBe('Yday');
    expect(
      formatNoteTimeShort(new Date(2026, 9, 1, 12, 0, 0).toISOString()),
    ).toMatch(/Oct/);
  });
});

describe('noteTitleInitials', () => {
  it('takes first letters of two words or first two chars of one', () => {
    expect(noteTitleInitials('A few things')).toBe('AF');
    expect(noteTitleInitials('Walk')).toBe('WA');
    expect(noteTitleInitials(null)).toBe('NO');
    expect(noteTitleInitials('  ')).toBe('NO');
  });
});

describe('formatNoteDuration', () => {
  it('formats whole seconds with s suffix and uses em dash when missing', () => {
    expect(formatNoteDuration(20)).toBe('20s');
    expect(formatNoteDuration(60)).toBe('60s');
    expect(formatNoteDuration(20.7)).toBe('20s');
    expect(formatNoteDuration(0)).toBe('—');
    expect(formatNoteDuration(null)).toBe('—');
    expect(formatNoteDuration(undefined)).toBe('—');
  });
});
