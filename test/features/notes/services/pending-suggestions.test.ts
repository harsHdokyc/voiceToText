import { describe, expect, it } from 'vitest';
import {
  pendingSuggestionIds,
  suggestionKindLabel,
} from '@/features/notes/services/pending-suggestions';

describe('pendingSuggestionIds', () => {
  it('keeps only pending ids in order', () => {
    expect(
      pendingSuggestionIds([
        { id: 'a', status: 'pending' },
        { id: 'b', status: 'approved' },
        { id: 'c', status: 'pending' },
        { id: 'd', status: 'rejected' },
      ]),
    ).toEqual(['a', 'c']);
  });

  it('returns empty when nothing is pending', () => {
    expect(
      pendingSuggestionIds([{ id: 'a', status: 'approved' }]),
    ).toEqual([]);
  });
});

describe('suggestionKindLabel', () => {
  it('maps stored kinds to display labels', () => {
    expect(suggestionKindLabel('follow_up')).toBe('Follow-up');
    expect(suggestionKindLabel('task')).toBe('Task');
    expect(suggestionKindLabel('idea')).toBe('Idea');
  });
});
