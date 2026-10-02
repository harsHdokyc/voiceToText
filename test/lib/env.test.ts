import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('getPublicEnv', () => {
  it('returns validated public Supabase env', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key');

    const { getPublicEnv } = await import('@/lib/env');
    expect(getPublicEnv()).toEqual({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pub-key',
    });
  });

  it('throws when the URL is missing or invalid', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key');

    const { getPublicEnv } = await import('@/lib/env');
    expect(() => getPublicEnv()).toThrow(/Missing or invalid public env/i);
  });

  it('throws when the publishable key is empty', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');

    const { getPublicEnv } = await import('@/lib/env');
    expect(() => getPublicEnv()).toThrow(/Missing or invalid public env/i);
  });
});
