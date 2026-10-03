import { ApiError } from '@/lib/api-error';
import { describe, expect, it } from 'vitest';
import {
  assertTaskStatusTransition,
  buildCompleteTaskPatch,
  buildReopenTaskPatch,
  buildTaskEdits,
  canTransitionTaskStatus,
  normalizeTaskSearchQuery,
  taskMatchesSearch,
} from '@/features/tasks/services/task-status';

describe('canTransitionTaskStatus', () => {
  it('allows open -> completed and reopen', () => {
    expect(canTransitionTaskStatus('open', 'completed')).toBe(true);
    expect(canTransitionTaskStatus('completed', 'open')).toBe(true);
    expect(canTransitionTaskStatus('open', 'archived')).toBe(true);
    expect(canTransitionTaskStatus('archived', 'open')).toBe(false);
  });
});

describe('assertTaskStatusTransition', () => {
  it('throws on illegal transitions', () => {
    expect(() => assertTaskStatusTransition('archived', 'open')).toThrow(
      ApiError,
    );
  });
});

describe('normalizeTaskSearchQuery', () => {
  it('returns undefined for blank input', () => {
    expect(normalizeTaskSearchQuery('   ')).toBeUndefined();
  });

  it('strips wildcards and filter metacharacters', () => {
    expect(normalizeTaskSearchQuery('  buy%milk_ (x)  ')).toBe('buymilk x');
  });
});

describe('taskMatchesSearch', () => {
  it('matches title or details case-insensitively', () => {
    const task = { title: 'Buy Milk', details: 'From store' };
    expect(taskMatchesSearch(task, 'milk')).toBe(true);
    expect(taskMatchesSearch(task, 'STORE')).toBe(true);
    expect(taskMatchesSearch(task, 'eggs')).toBe(false);
  });
});

describe('buildCompleteTaskPatch / buildReopenTaskPatch', () => {
  it('sets completed_at when completing', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    expect(buildCompleteTaskPatch(now)).toEqual({
      status: 'completed',
      completed_at: '2026-10-02T12:00:00.000Z',
    });
  });

  it('clears completed_at when reopening', () => {
    expect(buildReopenTaskPatch()).toEqual({
      status: 'open',
      completed_at: null,
    });
  });
});

describe('buildTaskEdits', () => {
  const original = {
    title: 'Buy milk',
    details: '2%',
    due_at: null as string | null,
    priority: null as 'low' | 'normal' | 'high' | null,
  };

  it('returns undefined when unchanged', () => {
    expect(
      buildTaskEdits(original, {
        title: 'Buy milk',
        details: '2%',
        due_at: null,
        priority: null,
      }),
    ).toBeUndefined();
  });

  it('includes only changed fields', () => {
    expect(
      buildTaskEdits(original, {
        title: 'Get milk',
        details: '2%',
        due_at: '2026-10-03T00:00:00.000Z',
        priority: 'high',
      }),
    ).toEqual({
      title: 'Get milk',
      due_at: '2026-10-03T00:00:00.000Z',
      priority: 'high',
    });
  });

  it('rejects blank titles', () => {
    expect(() =>
      buildTaskEdits(original, {
        title: '  ',
        details: '',
        due_at: null,
        priority: null,
      }),
    ).toThrow(ApiError);
  });
});
