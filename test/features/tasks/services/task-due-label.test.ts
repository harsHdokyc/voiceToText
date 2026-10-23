import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dueLabel,
  isOverdueDueLabel,
  taskListQueryForFilter,
} from '@/features/tasks/services/task-due-label';

afterEach(() => vi.useRealTimers());

describe('dueLabel', () => {
  it('uses relative labels for date-only dues (stored at local noon)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    expect(dueLabel(null)).toBe('Anytime');
    expect(dueLabel(new Date(2026, 9, 9, 12).toISOString())).toBe('Today');
    expect(dueLabel(new Date(2026, 9, 10, 12).toISOString())).toBe('Tomorrow');
    expect(dueLabel(new Date(2026, 9, 8, 12).toISOString())).toMatch(
      /^Overdue · (Oct 8|8 Oct)$/,
    );
  });

  it('shows the time when the due has one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    expect(dueLabel(new Date(2026, 9, 9, 18).toISOString())).toMatch(
      /^Today · 6:00\spm$/i,
    );
    expect(dueLabel(new Date(2026, 9, 10, 14).toISOString())).toMatch(
      /^Tomorrow · 2:00\spm$/i,
    );
  });

  it('marks a timed due overdue once that time has passed today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 15));
    expect(dueLabel(new Date(2026, 9, 9, 14).toISOString())).toMatch(
      /^Overdue · Today · 2:00\spm$/i,
    );
    expect(dueLabel(new Date(2026, 9, 9, 16).toISOString())).toMatch(
      /^Today · 4:00\spm$/i,
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
    expect(taskListQueryForFilter('All')).toEqual({});
  });
});
