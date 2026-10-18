import { describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX,
  greetingName,
  normalizeDisplayName,
} from '@/features/settings/services/greeting-name';

describe('greetingName', () => {
  it('prefers display name, then email local-part, then there', () => {
    expect(greetingName('Alex', 'a@b.com')).toBe('Alex');
    expect(greetingName('  ', 'maya@example.com')).toBe('maya');
    expect(greetingName(null, null)).toBe('there');
  });
});

describe('normalizeDisplayName', () => {
  it('trims and clamps to max length', () => {
    expect(normalizeDisplayName('  Alex  ')).toBe('Alex');
    expect(normalizeDisplayName('x'.repeat(40)).length).toBe(DISPLAY_NAME_MAX);
  });
});
