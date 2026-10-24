import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { EditNextStepDraft } from '@/components/edit-next-step-sheet';
import {
  createTaskFromSheet,
  saveTaskFromEditSheet,
} from '@/features/tasks/services/task-edit-save';
import {
  completeTask,
  deleteTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { errorMessageForUi } from '@/lib/api-error';
import { invalidateWorkspace } from '@/lib/query-client';
import { showToast } from '@/lib/toast';
import { TASK_ROW_MUTATION_KEY, usePendingRowIds } from '@/lib/use-pending-row-ids';

/** Keyed by the list params, so screens asking for the same rows share one cache entry. */
export function useTaskList(params: { status?: 'open' | 'completed' }) {
  return useQuery({
    queryKey: ['tasks', 'list', params.status ?? 'all'],
    queryFn: () => listTasks(params),
  });
}

/** Complete/reopen, delete, edit and create for task rows, plus the edit sheet's props. */
export function useTaskActions(options: { onRemoved?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);
  const refresh = () => invalidateWorkspace(queryClient, 'taskChanged');

  const toggle = useMutation({
    mutationKey: TASK_ROW_MUTATION_KEY,
    mutationFn: (task: TaskRow) =>
      task.status === 'completed' ? reopenTask(task.id) : completeTask(task.id),
    onSuccess: (_data, task) => {
      showToast(task.status === 'completed' ? 'Reopened' : 'Completed');
      return refresh();
    },
    onError: (err) =>
      showToast(errorMessageForUi(err, 'Update failed'), {
        tone: 'destructive',
      }),
  });
  const remove = useMutation({
    mutationKey: TASK_ROW_MUTATION_KEY,
    mutationFn: (task: { id: string }) => deleteTask(task.id),
    onSuccess: async () => {
      showToast('Removed');
      await refresh();
      options.onRemoved?.();
    },
    onError: (err) =>
      showToast(errorMessageForUi(err, 'Remove failed'), {
        tone: 'destructive',
      }),
  });
  const saveEdit = useMutation({
    mutationFn: saveTaskFromEditSheet,
    onSuccess: async () => {
      setEditing(null);
      showToast('Saved');
      await refresh();
    },
    onError: (err) =>
      showToast(errorMessageForUi(err, 'Save failed'), {
        tone: 'destructive',
      }),
  });
  const create = useMutation({
    mutationFn: createTaskFromSheet,
    onSuccess: async () => {
      setCreating(false);
      showToast('Added');
      await refresh();
    },
    onError: (err) =>
      showToast(errorMessageForUi(err, 'Create failed'), {
        tone: 'destructive',
      }),
  });
  const busyIds = usePendingRowIds(TASK_ROW_MUTATION_KEY);
  const sheetMutation = creating ? create : saveEdit;

  return {
    toggle: (task: TaskRow) => toggle.mutate(task),
    remove: (task: TaskRow) => remove.mutate(task),
    edit: setEditing,
    startCreate: () => setCreating(true),
    isBusy: (id: string) => busyIds.includes(id),
    removing: remove.isPending,
    sheetBusy: sheetMutation.isPending,
    error: toggle.error ?? remove.error,
    sheet: {
      open: creating || editing !== null,
      onClose: () => {
        if (sheetMutation.isPending) return;
        setCreating(false);
        setEditing(null);
        create.reset();
      },
      initialTitle: editing?.title ?? '',
      initialDueAt: editing?.due_at ?? null,
      mode: (creating ? 'create' : 'task') as 'create' | 'task',
      busy: sheetMutation.isPending,
      error: sheetMutation.error
        ? errorMessageForUi(sheetMutation.error, creating ? 'Create failed' : 'Save failed')
        : null,
      onSave: (draft: EditNextStepDraft) => {
        if (creating) create.mutate(draft);
        else if (editing) saveEdit.mutate({ task: editing, ...draft });
      },
    },
  };
}
