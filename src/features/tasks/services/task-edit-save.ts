import type { ReminderHourPreset } from '@/features/reminders/services/reminder-schedule';
import { scheduleReminderPreset } from '@/features/reminders/services/reminders-service';
import {
  createManualTask,
  updateTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';

/** Save title/due from the edit sheet; optionally schedule a reminder preset. */
export async function saveTaskFromEditSheet(params: {
  task: TaskRow;
  title: string;
  dueAt: string | null;
  reminderHours: ReminderHourPreset | null;
}) {
  const { task, title, dueAt, reminderHours } = params;
  const updated = await updateTask(task.id, {
    title,
    details: task.details ?? '',
    due_at: dueAt,
    priority: task.priority,
  });
  if (reminderHours && task.status === 'open') {
    await scheduleReminderPreset(task.id, reminderHours);
  }
  return updated;
}

/** Create a manual task from the sheet; optionally schedule a reminder preset. */
export async function createTaskFromSheet(params: {
  title: string;
  dueAt: string | null;
  reminderHours: ReminderHourPreset | null;
}) {
  const task = await createManualTask({ title: params.title, due_at: params.dueAt });
  if (params.reminderHours) {
    await scheduleReminderPreset(task.id, params.reminderHours);
  }
  return task;
}
