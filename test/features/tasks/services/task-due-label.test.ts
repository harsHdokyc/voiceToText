import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dueLabel,
  isOverdueDueLabel,
  taskListQueryForFilter,
} from '@/features/tasks/services/task-due-label';

afterEach(() => vi.useRealTimers());

describe('dueLabel', () => {
  it('uses relative labels for a chosen due date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    expect(dueLabel(null)).toBe('Anytime');
    expect(dueLabel(new Date(2026, 9, 9, 18).toISOString())).toBe('Today');
    expect(dueLabel(new Date(2026, 9, 10, 9).toISOString())).toBe('Tomorrow');
    expect(dueLabel(new Date(2026, 9, 8, 9).toISOString())).toMatch(
      /^Overdue · /,
    );
  });
});

describe('isOverdueDueLabel', () => {
  it('detects overdue prefix', () => {
    expect(isOverdueDueLabel('Overdue · Oct 8')).toBe(true);
    expect(isOverdueDueLabel('Today')).toBe(false);
  });
});

describe('taskListQueryForFilter', () => {
  it('maps Open Completed All to list params', () => {
    expect(taskListQueryForFilter('Open')).toEqual({ status: 'open' });
    expect(taskListQueryForFilter('Completed')).toEqual({
      status: 'completed',
    });
    expect(taskListQueryForFilter('All')).toEqual({ includeArchived: false });
  });
});
