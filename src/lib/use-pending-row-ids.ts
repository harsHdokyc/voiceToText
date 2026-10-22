import { useMutationState, type MutationKey } from '@tanstack/react-query';

export const SUGGESTION_ROW_MUTATION_KEY = ['row', 'suggestion'] as const;
export const TASK_ROW_MUTATION_KEY = ['row', 'task'] as const;

/**
 * Ids of rows with an in-flight mutation under `mutationKey` (mutations must take
 * the row `{ id }` as variables). Lets a list disable only the row being acted on,
 * and stays correct when several rows are pending at once.
 */
export function usePendingRowIds(mutationKey: MutationKey): string[] {
  return useMutationState({
    filters: { mutationKey, status: 'pending' },
    select: (mutation) => (mutation.state.variables as { id: string }).id,
  });
}
