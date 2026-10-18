import { describe, expect, it } from 'vitest';

import {
  dueAtFromLocalDateKey,
  dueDateKeyForPreset,
  localDateKey,
  localDateKeyFromDueAt,
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

describe('dueAtFromLocalDateKey', () => {
  it('stores noon UTC for the local date key', () => {
    expect(dueAtFromLocalDateKey('2026-10-13')).toBe(
      '2026-10-13T12:00:00.000Z',
    );
  });

  it('rejects bad keys', () => {
    expect(() => dueAtFromLocalDateKey('13-10-2026')).toThrow('Invalid');
  });
});

describe('localDateKeyFromDueAt', () => {
  it('reads the YYYY-MM-DD prefix', () => {
    expect(localDateKeyFromDueAt('2026-10-13T12:00:00.000Z')).toBe(
      '2026-10-13',
    );
    expect(localDateKeyFromDueAt(null)).toBeNull();
  });
});
