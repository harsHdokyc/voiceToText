import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dueDayOffset,
  dueLabel,
  isOverdueDueLabel,
  taskListQueryForStatus,
  taskMatchesListFilter,
  whenFilterDayMeta,
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

describe('taskListQueryForStatus', () => {
  it('maps Open Completed All to list params', () => {
    expect(taskListQueryForStatus('Open')).toEqual({ status: 'open' });
    expect(taskListQueryForStatus('Completed')).toEqual({
      status: 'completed',
    });
    expect(taskListQueryForStatus('All')).toEqual({});
  });
});

describe('dueDayOffset', () => {
  it('returns calendar-day offset from local midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 15));
    expect(dueDayOffset(null)).toBeNull();
    expect(dueDayOffset(new Date(2026, 9, 9, 12).toISOString())).toBe(0);
    expect(dueDayOffset(new Date(2026, 9, 10, 9).toISOString())).toBe(1);
    expect(dueDayOffset(new Date(2026, 9, 8, 23).toISOString())).toBe(-1);
  });
});

describe('whenFilterDayMeta', () => {
  it('returns weekday and calendar day for relative filters', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 15)); // Thu Oct 9
    expect(whenFilterDayMeta('Today').day).toBe(9);
    expect(whenFilterDayMeta('Today').weekday.length).toBeGreaterThan(0);
    expect(whenFilterDayMeta('Tomorrow').day).toBe(10);
    expect(whenFilterDayMeta('Yesterday').day).toBe(8);
  });
});

describe('taskMatchesListFilter', () => {
  it('applies status and when as independent axes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 9));
    const todayOpen = {
      status: 'open',
      due_at: new Date(2026, 9, 9, 12).toISOString(),
    };
    const tomorrowDone = {
      status: 'completed',
      due_at: new Date(2026, 9, 10, 12).toISOString(),
    };
    const yesterdayOpen = {
      status: 'open',
      due_at: new Date(2026, 9, 8, 12).toISOString(),
    };
    const anytime = { status: 'open', due_at: null };

    expect(taskMatchesListFilter(todayOpen, 'Open', 'Anytime')).toBe(true);
    expect(taskMatchesListFilter(tomorrowDone, 'Open', 'Anytime')).toBe(false);
    expect(taskMatchesListFilter(tomorrowDone, 'Completed', 'Anytime')).toBe(
      true,
    );
    expect(taskMatchesListFilter(anytime, 'All', 'Anytime')).toBe(true);

    expect(taskMatchesListFilter(todayOpen, 'Open', 'Today')).toBe(true);
    expect(taskMatchesListFilter(anytime, 'Open', 'Today')).toBe(false);
    expect(taskMatchesListFilter(tomorrowDone, 'All', 'Tomorrow')).toBe(true);
    expect(taskMatchesListFilter(tomorrowDone, 'Open', 'Tomorrow')).toBe(false);
    expect(taskMatchesListFilter(yesterdayOpen, 'Open', 'Yesterday')).toBe(
      true,
    );
    expect(taskMatchesListFilter(todayOpen, 'Open', 'Yesterday')).toBe(false);
  });
});
