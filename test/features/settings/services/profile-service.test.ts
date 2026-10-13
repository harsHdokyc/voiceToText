import { describe, expect, it } from 'vitest';
import { greetingName } from '@/features/settings/services/greeting-name';

describe('greetingName', () => {
  it('prefers display name, then email local-part, then there', () => {
    expect(greetingName('Alex', 'a@b.com')).toBe('Alex');
    expect(greetingName('  ', 'maya@example.com')).toBe('maya');
    expect(greetingName(null, null)).toBe('there');
  });
});
