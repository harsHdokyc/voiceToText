import { afterEach, describe, expect, it } from 'vitest';
import { clearToast, showToast, subscribeToast } from '@/lib/toast';

afterEach(() => clearToast());

describe('showToast', () => {
  it('publishes a trimmed default toast to subscribers', () => {
    let seen: ReturnType<typeof showToast> | unknown = undefined;
    const unsub = subscribeToast((t) => {
      seen = t;
    });
    showToast('  Saved  ');
    expect(seen).toEqual({
      id: expect.any(Number),
      message: 'Saved',
      tone: 'default',
    });
    unsub();
  });

  it('ignores blank messages', () => {
    let calls = 0;
    const unsub = subscribeToast(() => {
      calls += 1;
    });
    calls = 0;
    showToast('   ');
    expect(calls).toBe(0);
    unsub();
  });

  it('replaces the previous toast and supports destructive tone', () => {
    const messages: (string | null)[] = [];
    const unsub = subscribeToast((t) => {
      messages.push(t ? `${t.tone}:${t.message}` : null);
    });
    // initial null from subscribe
    messages.length = 0;
    showToast('One');
    showToast('Two', { tone: 'destructive' });
    clearToast();
    expect(messages).toEqual([
      'default:One',
      'destructive:Two',
      null,
    ]);
    unsub();
  });
});
