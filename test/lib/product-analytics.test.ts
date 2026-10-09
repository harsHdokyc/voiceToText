import { describe, expect, it } from 'vitest';
import {
  assertSafeAnalyticsFields,
  trackProductEvent,
} from '@/lib/product-analytics';

describe('assertSafeAnalyticsFields', () => {
  it('allows ids and codes', () => {
    expect(() =>
      assertSafeAnalyticsFields({ noteId: 'n1', code: 'ok' }),
    ).not.toThrow();
  });

  it('rejects transcript/audio keys', () => {
    expect(() => assertSafeAnalyticsFields({ transcript: 'hi' })).toThrow(
      /forbidden/i,
    );
  });
});

describe('trackProductEvent', () => {
  it('does not throw for a known event with safe fields', () => {
    expect(() =>
      trackProductEvent('task_completed', { taskId: 't1' }),
    ).not.toThrow();
  });
});
