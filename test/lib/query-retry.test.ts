import { describe, expect, it } from 'vitest';

import { shouldRetryQuery } from '@/lib/query-retry';

describe('shouldRetryQuery', () => {
  it('does not retry authz / not-found statuses', () => {
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 403 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 404 })).toBe(false);
  });

  it('retries other failures up to two attempts', () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(1, new Error('network'))).toBe(true);
    expect(shouldRetryQuery(2, { status: 500 })).toBe(false);
  });
});
