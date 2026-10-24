import { describe, expect, it } from 'vitest';

import { ApiError, errorMessageForUi } from '@/lib/api-error';

describe('errorMessageForUi', () => {
  it('surfaces the real Edge reason for rate_limited, not a rewritten blurb', () => {
    expect(
      errorMessageForUi(
        new ApiError('rate_limited', 'Daily process-note limit 40 reached'),
      ),
    ).toBe('Daily process-note limit 40 reached');
  });

  it('surfaces the real usage-count failure reason', () => {
    expect(
      errorMessageForUi(new ApiError('usage_count_failed', 'connection reset')),
    ).toBe('connection reset');
  });

  it('uses fallback only when the error has no reason', () => {
    expect(errorMessageForUi({}, 'Save failed')).toBe('Save failed');
  });
});
