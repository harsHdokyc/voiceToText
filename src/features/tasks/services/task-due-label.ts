import { localTimeKeyFromDueAt } from '@/features/tasks/services/due-presets';

/**
 * Calendar-day offset of a due_at vs local midnight of `now`.
 * 0 = today, 1 = tomorrow, -1 = yesterday. Null when there is no due date.
 */
export function dueDayOffset(
  dueAt: string | null | undefined,
  now = new Date(),
): number | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  if (!Number.isFinite(d.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

/** Human due label for task rows: Today / Tomorrow / Overdue / date / Anytime, plus time when set. */
export function dueLabel(dueAt: string | null | undefined, now = new Date()): string {
  if (!dueAt) return 'Anytime';
  const d = new Date(dueAt);
  if (!Number.isFinite(d.getTime())) return 'Anytime';

  const hasTime = localTimeKeyFromDueAt(dueAt) !== null;
  const time = hasTime
    ? ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : '';

  const diff = dueDayOffset(dueAt, now);
  if (diff === null) return 'Anytime';

  if (diff < 0 || (hasTime && d.getTime() < now.getTime())) {
    const when = diff === 0
      ? 'Today'
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `Overdue · ${when}${time}`;
  }
  if (diff === 0) return `Today${time}`;
  if (diff === 1) return `Tomorrow${time}`;
  return `${d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}${time}`;
}

export function isOverdueDueLabel(label: string): boolean {
  return label.startsWith('Overdue');
}

/** Status axis — segmented control (Open / Completed / All). */
export type TaskStatusFilter = 'Open' | 'Completed' | 'All';

/** Due-day axis — date strip. Anytime = no day constraint. */
export type TaskWhenFilter = 'Anytime' | 'Yesterday' | 'Today' | 'Tomorrow';

export const TASK_STATUS_FILTERS: TaskStatusFilter[] = [
  'Open',
  'Completed',
  'All',
];

export const TASK_WHEN_DAY_FILTERS: Exclude<TaskWhenFilter, 'Anytime'>[] = [
  'Yesterday',
  'Today',
  'Tomorrow',
];

/** Map status segment to listTasks params. When-filter always runs client-side. */
export function taskListQueryForStatus(status: TaskStatusFilter): {
  status?: 'open' | 'completed';
} {
  if (status === 'Open') return { status: 'open' };
  if (status === 'Completed') return { status: 'completed' };
  return {};
}

/** Weekday + calendar day for a relative when-filter cell (Todoist-style strip). */
export function whenFilterDayMeta(
  when: Exclude<TaskWhenFilter, 'Anytime'>,
  now = new Date(),
): { weekday: string; day: number } {
  const offset = when === 'Yesterday' ? -1 : when === 'Today' ? 0 : 1;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    day: d.getDate(),
  };
}

/** Keep a task for the active status + when axes. */
export function taskMatchesListFilter(
  task: { status: string; due_at: string | null },
  status: TaskStatusFilter,
  when: TaskWhenFilter,
  now = new Date(),
): boolean {
  if (status === 'Open' && task.status !== 'open') return false;
  if (status === 'Completed' && task.status !== 'completed') return false;

  if (when === 'Anytime') return true;
  const offset = dueDayOffset(task.due_at, now);
  if (offset === null) return false;
  if (when === 'Today') return offset === 0;
  if (when === 'Tomorrow') return offset === 1;
  if (when === 'Yesterday') return offset === -1;
  return true;
}
