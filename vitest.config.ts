import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@supabaseShared': path.resolve(__dirname, 'supabase/functions/_shared'),
      // RN ships Flow source Node can't parse; web build exposes the same Platform/AppState APIs.
      'react-native': 'react-native-web',
    },
  },
});
