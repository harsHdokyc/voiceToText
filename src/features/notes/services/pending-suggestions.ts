import type { SuggestionStatus } from '@/features/notes/services/suggestions-service';

/** Ids of suggestions still waiting for a decision (approve-all input). */
export function pendingSuggestionIds(
  rows: ReadonlyArray<{ id: string; status: SuggestionStatus }>,
): string[] {
  return rows.filter((r) => r.status === 'pending').map((r) => r.id);
}

export function suggestionKindLabel(kind: string): string {
  switch (kind) {
    case 'follow_up':
      return 'Follow-up';
    case 'task':
      return 'Task';
    case 'idea':
      return 'Idea';
    case 'reminder':
      return 'Reminder';
    case 'question':
      return 'Question';
    default:
      return kind.replaceAll('_', ' ');
  }
}
