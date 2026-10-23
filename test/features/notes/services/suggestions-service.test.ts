import { describe, expect, it, vi } from 'vitest';

import { buildSuggestionEdits } from '@/features/notes/services/suggestions-service';
import { ApiError } from '@/lib/api-error';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('buildSuggestionEdits', () => {
  const base = {
    title: 'Buy milk',
    details: null as string | null,
    kind: 'task' as const,
    due_at: null as string | null,
    priority: null as 'low' | 'normal' | 'high' | null,
  };

  it('returns undefined when draft matches original', () => {
    expect(
      buildSuggestionEdits(base, {
        title: 'Buy milk',
        details: '',
        kind: 'task',
        due_at: null,
        priority: null,
      }),
    ).toBeUndefined();
  });

  it('includes only changed fields', () => {
    expect(
      buildSuggestionEdits(
        { ...base, details: '2%' },
        {
          title: 'Get milk',
          details: '2%',
          kind: 'task',
          due_at: null,
          priority: null,
        },
      ),
    ).toEqual({ title: 'Get milk' });

    expect(
      buildSuggestionEdits(
        { ...base, details: '2%' },
        {
          title: 'Buy milk',
          details: '',
          kind: 'reminder',
          due_at: '2026-10-04T00:00:00.000Z',
          priority: 'high',
        },
      ),
    ).toEqual({
      details: '',
      kind: 'reminder',
      due_at: '2026-10-04T00:00:00.000Z',
      priority: 'high',
    });
  });

  it('does not send a cleared due date (approve-suggestion only accepts values)', () => {
    expect(
      buildSuggestionEdits(
        { ...base, due_at: '2026-10-04T12:00:00.000Z' },
        { title: 'Buy milk', details: '', kind: 'task', due_at: null, priority: null },
      ),
    ).toBeUndefined();
  });

  it('rejects blank titles', () => {
    expect(() =>
      buildSuggestionEdits(base, {
        title: '   ',
        details: '',
        kind: 'task',
        due_at: null,
        priority: null,
      }),
    ).toThrow(ApiError);
  });
});
