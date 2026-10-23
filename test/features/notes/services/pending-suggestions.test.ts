import { describe, expect, it } from 'vitest';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';

describe('suggestionKindLabel', () => {
  it('maps stored kinds to display labels', () => {
    expect(suggestionKindLabel('follow_up')).toBe('Follow-up');
    expect(suggestionKindLabel('task')).toBe('Task');
    expect(suggestionKindLabel('idea')).toBe('Idea');
  });
});
