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

  it('does not mark a later time today as overdue before that clock time', () => {
    vi.useFakeTimers();
    // 00:36 local on Oct 24 — afternoon dues must still read Today, not Overdue.
    vi.setSystemTime(new Date(2026, 9, 24, 0, 36));
    expect(dueLabel(new Date(2026, 9, 24, 14).toISOString())).toMatch(
      /^Today · 2:00\spm$/i,
    );
    expect(dueLabel(new Date(2026, 9, 24, 23).toISOString())).toMatch(
      /^Today · 11:00\spm$/i,
    );
  });

  it('marks a past calendar day overdue even when the clock time is later today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 0, 36));
    // July 24 2pm local is months ago — Overdue is correct (wrong month is an extract bug).
    expect(dueLabel(new Date(2026, 6, 24, 14).toISOString())).toMatch(
      /^Overdue · (Jul 24|24 Jul) · 2:00\spm$/i,
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
