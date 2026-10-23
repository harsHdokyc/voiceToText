import { describe, expect, it } from 'vitest';

import {
  localIso,
  offsetMinutes,
  parseDueAt,
  resolveTimeZone,
} from '@supabaseShared/time/user-time';

describe('resolveTimeZone', () => {
  it('keeps real IANA zones from anywhere in the world', () => {
    expect(resolveTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
    expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
    expect(resolveTimeZone(' Europe/London ')).toBe('Europe/London');
  });

  it('falls back to UTC for missing or bogus zones', () => {
    expect(resolveTimeZone(null)).toBe('UTC');
    expect(resolveTimeZone('')).toBe('UTC');
    expect(resolveTimeZone('Mars/Olympus')).toBe('UTC');
    expect(resolveTimeZone(42)).toBe('UTC');
  });
});

describe('offsetMinutes', () => {
  it('returns fixed and half-hour offsets', () => {
    const ms = Date.UTC(2026, 9, 23, 12);
    expect(offsetMinutes('UTC', ms)).toBe(0);
    expect(offsetMinutes('Asia/Kolkata', ms)).toBe(330);
    expect(offsetMinutes('Asia/Kathmandu', ms)).toBe(345);
  });

  it('follows daylight saving in New York', () => {
    expect(offsetMinutes('America/New_York', Date.UTC(2026, 6, 1))).toBe(-240);
    expect(offsetMinutes('America/New_York', Date.UTC(2026, 0, 15))).toBe(-300);
  });
});

describe('localIso', () => {
  it('shows the user wall clock with offset', () => {
    const ms = Date.UTC(2026, 9, 23, 18, 29, 0);
    expect(localIso(ms, 'Asia/Kolkata')).toBe('2026-10-23T23:59:00+05:30');
    expect(localIso(ms, 'America/Los_Angeles')).toBe('2026-10-23T11:29:00-07:00');
    expect(localIso(ms, 'UTC')).toBe('2026-10-23T18:29:00+00:00');
  });

  it('rolls the date for zones already in tomorrow', () => {
    const ms = Date.UTC(2026, 9, 23, 18, 0, 0);
    expect(localIso(ms, 'Pacific/Auckland')).toBe('2026-10-24T07:00:00+13:00');
  });
});

describe('parseDueAt', () => {
  it('trusts explicit offsets and Z regardless of user zone', () => {
    expect(parseDueAt('2026-10-24T17:00:00+05:30', 'America/New_York')).toBe(
      '2026-10-24T11:30:00.000Z',
    );
    expect(parseDueAt('2024-12-31T23:59:59.000Z', 'Asia/Kolkata')).toBe(
      '2024-12-31T23:59:59.000Z',
    );
  });

  it('reads a naive time as the user wall clock', () => {
    expect(parseDueAt('2026-10-24T17:00:00', 'Asia/Kolkata')).toBe(
      '2026-10-24T11:30:00.000Z',
    );
    expect(parseDueAt('2026-10-24T17:00', 'America/New_York')).toBe(
      '2026-10-24T21:00:00.000Z',
    );
    expect(parseDueAt('2026-10-24', 'Asia/Tokyo')).toBe(
      '2026-10-23T15:00:00.000Z',
    );
  });

  it('uses the offset in effect on the due date across DST', () => {
    expect(parseDueAt('2026-11-02T09:00:00', 'America/New_York')).toBe(
      '2026-11-02T14:00:00.000Z',
    );
    expect(parseDueAt('2026-10-30T09:00:00', 'America/New_York')).toBe(
      '2026-10-30T13:00:00.000Z',
    );
  });

  it('rejects empty, vague, and impossible dates', () => {
    expect(parseDueAt(null, 'UTC')).toBeNull();
    expect(parseDueAt('  ', 'UTC')).toBeNull();
    expect(parseDueAt('tomorrow at 5', 'UTC')).toBeNull();
    expect(parseDueAt('2026-02-30T10:00:00', 'UTC')).toBeNull();
    expect(parseDueAt('2026-13-01', 'UTC')).toBeNull();
  });
});
