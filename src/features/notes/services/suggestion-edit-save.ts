import {
  approveSuggestion,
  buildSuggestionEdits,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import type { ReminderHourPreset } from '@/features/reminders/services/reminder-schedule';
import { scheduleReminderPreset } from '@/features/reminders/services/reminders-service';

/**
 * Pending suggestions cannot be field-updated under RLS — edits apply via approve.
 * Optional reminder schedules on the created task afterward.
 */
export async function approveSuggestionWithEdit(params: {
  suggestion: TaskSuggestion;
  title: string;
  dueAt: string | null;
  reminderHours: ReminderHourPreset | null;
}) {
  const { suggestion, title, dueAt, reminderHours } = params;
  const edits = buildSuggestionEdits(suggestion, {
    title,
    details: suggestion.details ?? '',
    kind: suggestion.kind,
    due_at: dueAt,
    priority: suggestion.priority,
  });
  const body = await approveSuggestion(suggestion.id, edits);
  const taskId = body.taskId;
  if (taskId && reminderHours) await scheduleReminderPreset(taskId, reminderHours);
  return body;
}
