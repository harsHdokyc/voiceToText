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
