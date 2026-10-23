import { localTimeKeyFromDueAt } from '@/features/tasks/services/due-presets';

/** Human due label for task rows: Today / Tomorrow / Overdue / date / Anytime, plus time when set. */
export function dueLabel(dueAt: string | null | undefined, now = new Date()): string {
  if (!dueAt) return 'Anytime';
  const d = new Date(dueAt);
  if (!Number.isFinite(d.getTime())) return 'Anytime';

  const hasTime = localTimeKeyFromDueAt(dueAt) !== null;
  const time = hasTime
    ? ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : '';

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);

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

export type TaskListFilter = 'Open' | 'Completed' | 'All';

export const TASK_LIST_FILTERS: TaskListFilter[] = ['Open', 'Completed', 'All'];

/** Map UI filter chips to listTasks params. */
export function taskListQueryForFilter(filter: TaskListFilter): {
  status?: 'open' | 'completed';
} {
  if (filter === 'Open') return { status: 'open' };
  if (filter === 'Completed') return { status: 'completed' };
  return {};
}
