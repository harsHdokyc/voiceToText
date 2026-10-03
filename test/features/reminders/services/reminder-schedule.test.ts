import { describe, expect, it } from 'vitest';
import {
  assertReminderSchedule,
  buildReminderIdempotencyKey,
  reminderAtHoursFromNow,
} from '@/features/reminders/services/reminder-schedule';

describe('buildReminderIdempotencyKey', () => {
  it('is stable for task + instant', () => {
    expect(
      buildReminderIdempotencyKey('t1', '2026-10-03T12:00:00.000Z'),
    ).toBe('task:t1:at:2026-10-03T12:00:00.000Z');
  });
});

describe('assertReminderSchedule', () => {
  const now = new Date('2026-10-03T12:00:00.000Z');

  it('accepts future ISO and normalizes to UTC ISO', () => {
    expect(assertReminderSchedule('2026-10-03T13:00:00.000Z', now)).toBe(
      '2026-10-03T13:00:00.000Z',
    );
  });

  it('rejects past times', () => {
    expect(() =>
      assertReminderSchedule('2026-10-03T11:00:00.000Z', now),
    ).toThrow('future');
  });

  it('rejects invalid input', () => {
    expect(() => assertReminderSchedule('not-a-date', now)).toThrow('Invalid');
  });
});

describe('reminderAtHoursFromNow', () => {
  it('adds hours in UTC', () => {
    const now = new Date('2026-10-03T12:00:00.000Z');
    expect(reminderAtHoursFromNow(2, now)).toBe('2026-10-03T14:00:00.000Z');
  });

  it('rejects non-positive hours', () => {
    expect(() => reminderAtHoursFromNow(0)).toThrow('positive');
  });
});
