import { describe, expect, it } from 'vitest';

import { ApiError, errorMessageForUi } from '@/lib/api-error';

describe('errorMessageForUi', () => {
  it('maps rate_limited to a clear daily-cap message', () => {
    expect(
      errorMessageForUi(new ApiError('rate_limited', 'Daily process-note limit 40 reached')),
    ).toBe('Daily AI limit reached. Try again tomorrow.');
  });

  it('maps usage_count_failed to a retryable check message', () => {
    expect(
      errorMessageForUi(new ApiError('usage_count_failed', 'connection reset')),
    ).toBe('Could not check your daily AI limit. Try again in a moment.');
  });

  it('keeps other reasons as-is', () => {
    expect(errorMessageForUi(new ApiError('note_not_found', 'Note missing'))).toBe(
      'Note missing',
    );
  });
});
