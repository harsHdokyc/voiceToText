import { describe, expect, it } from 'vitest';

import { timeZoneToSync } from '@/features/settings/services/time-zone';

describe('timeZoneToSync', () => {
  it('writes the device zone when the profile has none yet', () => {
    expect(timeZoneToSync('Asia/Kolkata', null)).toBe('Asia/Kolkata');
  });

  it('updates the profile when the user travels', () => {
    expect(timeZoneToSync('Europe/London', 'Asia/Kolkata')).toBe('Europe/London');
  });

  it('skips the write when nothing changed or the device zone is unknown', () => {
    expect(timeZoneToSync('Asia/Kolkata', 'Asia/Kolkata')).toBeNull();
    expect(timeZoneToSync(null, 'Asia/Kolkata')).toBeNull();
    expect(timeZoneToSync('  ', null)).toBeNull();
  });
});
