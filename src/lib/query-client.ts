import { QueryClient } from '@tanstack/react-query';

import { shouldRetryQuery } from '@/lib/query-retry';

/** Notes, suggestions, tasks and reminders derive from the same rows; refresh them together after any change. */
export async function invalidateWorkspace(client: QueryClient) {
  await Promise.all(
    ['notes', 'suggestions', 'tasks', 'reminders'].map((key) =>
      client.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

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
