import 'expo-sqlite/localStorage/install';

import type { SupportedStorage } from '@supabase/supabase-js';

/** Native: Expo SQLite-backed localStorage polyfill for session persistence. */
export const authStorage = localStorage as SupportedStorage;
