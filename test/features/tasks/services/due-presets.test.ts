import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dueLabel } from '@/features/tasks/services/task-due-label';

import {
  dueAtFromLocalDateKey,
  dueDateKeyForPreset,
  localDateKey,
  localDateKeyFromDueAt,
  localTimeKeyFromDueAt,
} from '@/features/tasks/services/due-presets';

describe('localDateKey', () => {
  it('formats local Y-M-D with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 9, 13))).toBe('2026-10-13');
  });
});

describe('dueDateKeyForPreset', () => {
  const now = new Date(2026, 9, 13, 15, 30, 0); // local Oct 13

  it('resolves today / tomorrow / next week from local calendar', () => {
    expect(dueDateKeyForPreset('today', now)).toBe('2026-10-13');
    expect(dueDateKeyForPreset('tomorrow', now)).toBe('2026-10-14');
    expect(dueDateKeyForPreset('next_week', now)).toBe('2026-10-20');
  });
});

describe('due date convention (timezone-sensitive)', () => {
  const originalTz = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = 'Asia/Kolkata'; // UTC+5:30
  });
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('stores a date key as local noon', () => {
    expect(dueAtFromLocalDateKey('2026-10-13')).toBe('2026-10-13T06:30:00.000Z');
  });

  it('returns null for malformed or impossible dates', () => {
    expect(dueAtFromLocalDateKey('13-10-2026')).toBeNull();
    expect(dueAtFromLocalDateKey('2026-13-01')).toBeNull();
    expect(dueAtFromLocalDateKey('2026-02-30')).toBeNull();
  });

  it('reads back the same local day the list label shows, not the UTC day', () => {
    const aiDueAt = '2026-10-13T22:00:00.000Z'; // Oct 14, 03:30 in UTC+5:30
    expect(localDateKeyFromDueAt(aiDueAt)).toBe('2026-10-14');
    expect(dueLabel(aiDueAt, new Date(2026, 9, 14, 2))).toMatch(/^Today · 3:30\sam$/i);
  });

  it('stores date + time as that local wall-clock time', () => {
    expect(dueAtFromLocalDateKey('2026-10-24', '14:00')).toBe('2026-10-24T08:30:00.000Z');
    expect(dueAtFromLocalDateKey('2026-10-24', '23:00')).toBe('2026-10-24T17:30:00.000Z');
  });

  it('rejects impossible times instead of saving a wrong due', () => {
    expect(dueAtFromLocalDateKey('2026-10-24', '24:00')).toBeNull();
    expect(dueAtFromLocalDateKey('2026-10-24', '2pm')).toBeNull();
    expect(dueAtFromLocalDateKey('2026-10-24', '14:60')).toBeNull();
  });

  it('reads the local time back, treating local noon as date-only', () => {
    expect(localTimeKeyFromDueAt('2026-10-24T08:30:00.000Z')).toBe('14:00');
    expect(localTimeKeyFromDueAt(dueAtFromLocalDateKey('2026-10-24'))).toBeNull();
    expect(localTimeKeyFromDueAt(null)).toBeNull();
    expect(localTimeKeyFromDueAt('garbage')).toBeNull();
  });

  it('round-trips a key even at UTC+14', () => {
    process.env.TZ = 'Pacific/Kiritimati';
    expect(localDateKeyFromDueAt(dueAtFromLocalDateKey('2026-10-13'))).toBe('2026-10-13');
  });

  it('keeps reading legacy noon-UTC values as their calendar day', () => {
    expect(localDateKeyFromDueAt('2026-10-13T12:00:00.000Z')).toBe('2026-10-13');
    expect(localDateKeyFromDueAt(null)).toBeNull();
  });
});
