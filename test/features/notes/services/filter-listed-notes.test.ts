import { describe, expect, it } from 'vitest';

import { filterListedNotes } from '@/features/notes/services/filter-listed-notes';

describe('filterListedNotes', () => {
  const rows = [
    {
      id: '1',
      category: 'Work',
      title: 'Ship launch',
      transcript: 'ship it',
      edited_transcript: null,
    },
    {
      id: '2',
      category: 'Ideas',
      title: 'Garden plan',
      transcript: 'tomatoes',
      edited_transcript: null,
    },
    {
      id: '3',
      category: 'Personal',
      title: 'Call mom',
      transcript: 'sunday',
      edited_transcript: null,
    },
  ];

  it('keeps every row for All notes with empty search', () => {
    expect(filterListedNotes(rows, { category: 'All notes' }).map((r) => r.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('filters by category chip without touching other rows', () => {
    expect(filterListedNotes(rows, { category: 'Work' }).map((r) => r.id)).toEqual(['1']);
  });

  it('filters by search across title and transcript', () => {
    expect(
      filterListedNotes(rows, { query: 'tomato', category: 'All notes' }).map((r) => r.id),
    ).toEqual(['2']);
  });

  it('applies category and search together', () => {
    expect(
      filterListedNotes(rows, { query: 'ship', category: 'Ideas' }).map((r) => r.id),
    ).toEqual([]);
    expect(
      filterListedNotes(rows, { query: 'ship', category: 'Work' }).map((r) => r.id),
    ).toEqual(['1']);
  });
});
