import { QueryClient } from '@tanstack/react-query';

import { shouldRetryQuery } from '@/lib/query-retry';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
