import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import {
  assertTaskStatusTransition,
  buildCompleteTaskPatch,
  buildReopenTaskPatch,
  buildTaskEdits,
  normalizeTaskSearchQuery,
  taskMatchesSearch,
  type TaskEditDraft,
  type TaskPriority,
  type TaskStatus,
} from '@/features/tasks/services/task-status';

export type TaskRow = {
  id: string;
  user_id?: string;
  source_note_id: string | null;
  source_suggestion_id: string | null;
  title: string;
  details: string | null;
  status: TaskStatus;
  due_at: string | null;
  priority: TaskPriority | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const TASK_PUBLIC_SELECT =
  'id, source_note_id, source_suggestion_id, title, details, status, due_at, priority, completed_at, created_at, updated_at';

export type ListTasksParams = {
  /** When set, only that status. When omitted, open + completed (hide archived). */
  status?: TaskStatus;
  query?: string;
};

async function loadTask(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_PUBLIC_SELECT)
    .eq('id', taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ApiError('task_not_found', 'Task not found');
  }
  return data as TaskRow;
}

export async function listTasks(params: ListTasksParams = {}) {
  const search = params.query
    ? normalizeTaskSearchQuery(params.query)
    : undefined;

  return withApiLog(
    'api.tasks.list',
    { status: params.status ?? null, hasQuery: !!search },
    async () => {
      let q = supabase
        .from('tasks')
        .select(TASK_PUBLIC_SELECT)
        .order('created_at', { ascending: false });

      if (params.status) {
        q = q.eq('status', params.status);
      } else {
        q = q.in('status', ['open', 'completed']);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as TaskRow[];
      // ponytail: in-memory search for V1 volume; switch to FTS if lists get large.
      if (!search) return rows;
      return rows.filter((row) => taskMatchesSearch(row, search));
    },
  );
}

export async function getTask(taskId: string) {
  return withApiLog('api.tasks.get', { taskId }, async () => loadTask(taskId));
}

export async function updateTask(taskId: string, draft: TaskEditDraft) {
  return withApiLog('api.tasks.update', { taskId }, async () => {
    const current = await loadTask(taskId);
    if (current.status === 'archived') {
      throw new ApiError('task_archived', 'Archived tasks cannot be edited');
    }

    const edits = buildTaskEdits(current, draft);
    if (!edits) return current;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (edits.title !== undefined) patch.title = edits.title;
    if (edits.details !== undefined) {
      patch.details = edits.details === '' ? null : edits.details;
    }
    if (edits.due_at !== undefined) patch.due_at = edits.due_at;
    if (edits.priority !== undefined) patch.priority = edits.priority;

    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .select(TASK_PUBLIC_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError('task_update_lost', 'Task update matched no row');
    }
    return data as TaskRow;
  });
}

export async function completeTask(taskId: string) {
  return withApiLog('api.tasks.complete', { taskId }, async () => {
    const current = await loadTask(taskId);
    assertTaskStatusTransition(current.status, 'completed');
    const patch = {
      ...buildCompleteTaskPatch(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('status', current.status)
      .select(TASK_PUBLIC_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError(
        'task_status_transition_lost',
        `Could not complete task from ${current.status}`,
      );
    }
    return data as TaskRow;
  });
}

export async function reopenTask(taskId: string) {
  return withApiLog('api.tasks.reopen', { taskId }, async () => {
    const current = await loadTask(taskId);
    assertTaskStatusTransition(current.status, 'open');
    const patch = {
      ...buildReopenTaskPatch(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('status', current.status)
      .select(TASK_PUBLIC_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError(
        'task_status_transition_lost',
        `Could not reopen task from ${current.status}`,
      );
    }
    return data as TaskRow;
  });
}
