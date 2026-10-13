import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NOTE_CATEGORY,
  formatNoteTime,
  isNoteCategory,
  noteCardTone,
  noteMatchesCategoryFilter,
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
