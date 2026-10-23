import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { EditNextStepDraft } from '@/components/edit-next-step-sheet';
import { approveSuggestionWithEdit } from '@/features/notes/services/suggestion-edit-save';
import {
  approveSuggestion,
  listPendingSuggestions,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { errorMessageForUi } from '@/lib/api-error';
import { invalidateWorkspace } from '@/lib/query-client';
import { SUGGESTION_ROW_MUTATION_KEY, usePendingRowIds } from '@/lib/use-pending-row-ids';

/** One cache entry for every screen that lists pending suggestions. */
export function usePendingSuggestions() {
  return useQuery({
    queryKey: ['suggestions', 'pending'],
    queryFn: () => listPendingSuggestions(100),
  });
}

/** Approve / dismiss / edit-and-approve for suggestion rows, plus the edit sheet's props. */
export function useSuggestionReview() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaskSuggestion | null>(null);
  const refresh = () => invalidateWorkspace(queryClient);

  const approve = useMutation({
    mutationKey: SUGGESTION_ROW_MUTATION_KEY,
    mutationFn: (s: { id: string }) => approveSuggestion(s.id),
    onSuccess: refresh,
  });
  const dismiss = useMutation({
    mutationKey: SUGGESTION_ROW_MUTATION_KEY,
    mutationFn: (s: { id: string }) => rejectSuggestion(s.id),
    onSuccess: refresh,
  });
  const approveAll = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await approveSuggestion(id);
    },
    onSuccess: refresh,
  });
  const saveEdit = useMutation({
    mutationFn: approveSuggestionWithEdit,
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
  });
  const busyIds = usePendingRowIds(SUGGESTION_ROW_MUTATION_KEY);

  return {
    approve: (s: TaskSuggestion) => approve.mutate(s),
    dismiss: (s: TaskSuggestion) => dismiss.mutate(s),
    edit: setEditing,
    approveAll: (ids: string[]) => approveAll.mutate(ids),
    approvingAll: approveAll.isPending,
    isBusy: (id: string) => approveAll.isPending || busyIds.includes(id),
    anyBusy: busyIds.length > 0 || approveAll.isPending || saveEdit.isPending,
    error: approve.error ?? dismiss.error ?? approveAll.error,
    sheet: {
      open: editing !== null,
      onClose: () => {
        if (!saveEdit.isPending) setEditing(null);
      },
      initialTitle: editing?.title ?? '',
      initialDueAt: editing?.due_at ?? null,
      mode: 'suggestion' as const,
      busy: saveEdit.isPending,
      error: saveEdit.error ? errorMessageForUi(saveEdit.error, 'Save failed') : null,
      onSave: (draft: EditNextStepDraft) => {
        if (editing) saveEdit.mutate({ suggestion: editing, ...draft });
      },
    },
  };
}
