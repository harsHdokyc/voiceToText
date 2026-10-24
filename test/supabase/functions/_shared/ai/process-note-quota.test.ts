import { describe, expect, it } from 'vitest';

import {
  DAILY_PROCESS_NOTE_LIMIT,
  decideProcessNoteQuota,
} from '@supabaseShared/ai/process-note-quota';

describe('decideProcessNoteQuota', () => {
  it('allows process-note when under the daily cap', () => {
    expect(decideProcessNoteQuota(0, null)).toEqual({ ok: true, usageCount: 0 });
    expect(decideProcessNoteQuota(39, null)).toEqual({ ok: true, usageCount: 39 });
  });

  it('rate-limits at the daily cap', () => {
    expect(decideProcessNoteQuota(DAILY_PROCESS_NOTE_LIMIT, null)).toEqual({
      ok: false,
      code: 'rate_limited',
      usageCount: 40,
    });
    expect(decideProcessNoteQuota(41, null).ok).toBe(false);
  });

  it('fails closed when the usage RPC errors', () => {
    expect(decideProcessNoteQuota(0, 'connection reset')).toEqual({
      ok: false,
      code: 'usage_count_failed',
      reason: 'connection reset',
    });
  });

  it('fails closed when the count is missing without an error', () => {
    expect(decideProcessNoteQuota(null, null)).toEqual({
      ok: false,
      code: 'usage_count_failed',
      reason: 'Usage count missing',
    });
    expect(decideProcessNoteQuota(undefined, null)).toMatchObject({
      ok: false,
      code: 'usage_count_failed',
    });
  });
});
