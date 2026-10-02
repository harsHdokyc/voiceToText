import type { SupportedStorage } from '@supabase/supabase-js';

/** Web / default: browser localStorage. Avoids expo-sqlite WASM in the web bundle. */
export const authStorage: SupportedStorage = {
  getItem: (key) => {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.removeItem(key);
  },
};
