import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import {
  assertReminderSchedule,
  buildReminderIdempotencyKey,
} from '@/features/reminders/services/reminder-schedule';

export type ReminderStatus =
  | 'scheduled'
  | 'claimed'
  | 'sent'
  | 'cancelled'
  | 'failed';

export type ReminderRow = {
  id: string;
  task_id: string;
  scheduled_for: string;
  status: ReminderStatus;
  idempotency_key: string;
  attempt_count: number;
  last_error_code: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const REMINDER_SELECT =
  'id, task_id, scheduled_for, status, idempotency_key, attempt_count, last_error_code, sent_at, created_at, updated_at';

export async function listRemindersForTask(taskId: string) {
  return withApiLog('api.reminders.list', { taskId }, async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select(REMINDER_SELECT)
      .eq('task_id', taskId)
      .order('scheduled_for', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ReminderRow[];
  });
}

export async function scheduleReminder(params: {
  taskId: string;
  scheduledFor: string;
}) {
  return withApiLog(
    'api.reminders.schedule',
    { taskId: params.taskId },
    async () => {
      const scheduledFor = assertReminderSchedule(params.scheduledFor);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new ApiError('not_signed_in', 'Not signed in');

      const idempotencyKey = buildReminderIdempotencyKey(
        params.taskId,
        scheduledFor,
      );

      // Cancel other scheduled reminders for this task (one active schedule).
      await supabase
        .from('reminders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('task_id', params.taskId)
        .eq('user_id', user.id)
        .eq('status', 'scheduled');

      const { data, error } = await supabase
        .from('reminders')
        .upsert(
          {
            user_id: user.id,
            task_id: params.taskId,
            scheduled_for: scheduledFor,
            status: 'scheduled',
            idempotency_key: idempotencyKey,
            attempt_count: 0,
            last_error_code: null,
            sent_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'idempotency_key' },
        )
        .select(REMINDER_SELECT)
        .single();
      if (error) throw error;
      return data as ReminderRow;
    },
  );
}

export async function cancelReminder(reminderId: string) {
  return withApiLog('api.reminders.cancel', { reminderId }, async () => {
    const { data, error } = await supabase
      .from('reminders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .eq('status', 'scheduled')
      .select(REMINDER_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError(
        'reminder_cancel_lost',
        'Reminder not found or not scheduled',
      );
    }
    return data as ReminderRow;
  });
}
