import { QueryClient } from '@tanstack/react-query';

import { shouldRetryQuery } from '@/lib/query-retry';

/** Top-level React Query prefixes for workspace rows. */
export type WorkspaceCacheKey = 'notes' | 'suggestions' | 'tasks' | 'reminders';

/**
 * What changed → which prefixes to refresh.
 * Keeps mutation callers from inventing ad-hoc key lists (or blasting all four).
 */
export const WORKSPACE_REFRESH = {
  /** Approve / dismiss / edit-approve (may create a task + optional reminder). */
  suggestionDecided: ['suggestions', 'tasks', 'reminders'],
  /** Complete / reopen / edit / create / delete task (edit may schedule a reminder). */
  taskChanged: ['tasks', 'reminders'],
  /** Delete a note (suggestions go with it; note-sourced task lists shift). */
  noteDeleted: ['notes', 'suggestions', 'tasks'],
  /** Retry transcription / capture that starts processing. */
  noteProcessing: ['notes', 'suggestions'],
  /** New capture saved (list + any pending from prior notes unchanged except new draft). */
  captureCompleted: ['notes', 'suggestions'],
  /** Cancel / schedule a reminder only. */
  reminderChanged: ['reminders'],
} as const satisfies Record<string, readonly WorkspaceCacheKey[]>;

export type WorkspaceRefresh = keyof typeof WORKSPACE_REFRESH;

/** Invalidate the prefixes for a known workspace change. */
export async function invalidateWorkspace(
  client: QueryClient,
  change: WorkspaceRefresh,
) {
  const keys = WORKSPACE_REFRESH[change];
  await Promise.all(
    keys.map((key) => client.invalidateQueries({ queryKey: [key] })),
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
