import { ApiError } from '@/lib/api-error';

export const TASK_STATUSES = ['open', 'completed', 'archived'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskPriority = 'low' | 'normal' | 'high';

const ALLOWED: Record<TaskStatus, readonly TaskStatus[]> = {
  open: ['completed', 'archived'],
  completed: ['open', 'archived'],
  archived: [],
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus) {
  return ALLOWED[from].includes(to);
}

export function assertTaskStatusTransition(from: TaskStatus, to: TaskStatus) {
  if (!canTransitionTaskStatus(from, to)) {
    throw new ApiError(
      'invalid_task_status_transition',
      `Invalid task status transition: ${from} -> ${to}`,
    );
  }
}

/** Normalize search input; strip characters that would break filters. */
export function normalizeTaskSearchQuery(query: string): string | undefined {
  const trimmed = query
    .trim()
    .replaceAll('%', '')
    .replaceAll('_', '')
    .replace(/[(),.*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Case-insensitive substring match on title/details. */
export function taskMatchesSearch(
  task: { title: string; details: string | null },
  query: string,
): boolean {
  const needle = normalizeTaskSearchQuery(query)?.toLowerCase();
  if (!needle) return true;
  const haystack = `${task.title}\n${task.details ?? ''}`.toLowerCase();
  return haystack.includes(needle);
}

export function taskStatusLabel(status: TaskStatus) {
  return status.replaceAll('_', ' ');
}

export function buildCompleteTaskPatch(now = new Date()) {
  return {
    status: 'completed' as const,
    completed_at: now.toISOString(),
  };
}

export function buildReopenTaskPatch() {
  return {
    status: 'open' as const,
    completed_at: null,
  };
}

export type TaskEditDraft = {
  title: string;
  details: string;
  due_at: string | null;
  priority: TaskPriority | null;
};

/**
 * Diff editable task fields. Throws if title is blank after trim.
 * Returns undefined when nothing changed.
 */
export function buildTaskEdits(
  original: {
    title: string;
    details: string | null;
    due_at: string | null;
    priority: TaskPriority | null;
  },
  draft: TaskEditDraft,
): Partial<TaskEditDraft> | undefined {
  const title = draft.title.trim();
  if (!title) {
    throw new ApiError('title_required', 'Title is required');
  }
  const details = draft.details.trim() || null;
  const edits: Partial<TaskEditDraft> = {};
  if (title !== original.title) edits.title = title;
  if (details !== (original.details ?? null)) {
    edits.details = details ?? '';
  }
  if ((draft.due_at ?? null) !== (original.due_at ?? null)) {
    edits.due_at = draft.due_at;
  }
  if ((draft.priority ?? null) !== (original.priority ?? null)) {
    edits.priority = draft.priority;
  }
  return Object.keys(edits).length > 0 ? edits : undefined;
}
