import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { useTaskActions } from '@/features/tasks/hooks/use-task-actions';
import { getTask } from '@/features/tasks/services/tasks-service';
import { dueLabel } from '@/features/tasks/services/task-due-label';
import {
  cancelReminder,
  listRemindersForTask,
} from '@/features/reminders/services/reminders-service';
import { errorMessageForUi } from '@/lib/api-error';
import { invalidateWorkspace } from '@/lib/query-client';
import { colors, space } from '@/theme';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const actions = useTaskActions({ onRemoved: () => router.back() });

  const task = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => getTask(taskId),
    enabled: Boolean(taskId),
  });

  const reminders = useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => listRemindersForTask(taskId),
    enabled: Boolean(taskId),
  });

  const cancelRemind = useMutation({
    mutationFn: (reminderId: string) => cancelReminder(reminderId),
    onSuccess: () => invalidateWorkspace(queryClient, 'reminderChanged'),
  });

  if (task.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (task.isError || !task.data) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="font-sans text-destructive">
          {errorMessageForUi(task.error, 'Task not found')}
        </Text>
      </View>
    );
  }

  const row = task.data;
  const busy = actions.isBusy(row.id) || actions.sheetBusy || cancelRemind.isPending;
  const scheduled = (reminders.data ?? []).filter(
    (r) => r.status === 'scheduled',
  );

  return (
    <WorkspacePage gap={space[3]}>
      <Eyebrow>The things you chose</Eyebrow>
      <Text className="font-display text-[32px] text-ink">{row.title}</Text>
      <Text className="font-sans text-[13px] text-stone">
        {row.status} · {dueLabel(row.due_at)}
      </Text>

      {row.details ? (
        <Text className="font-sans text-[15px] leading-[22px] text-ink">
          {row.details}
        </Text>
      ) : null}

      {row.source_note_id ? (
        <Link
          href={{
            pathname: '/(app)/notes/[noteId]',
            params: { noteId: row.source_note_id },
          }}
          className="py-1 font-sans-medium text-sm text-cobalt"
        >
          Source note →
        </Link>
      ) : (
        <Text className="font-sans text-[13px] text-stone">No source note linked.</Text>
      )}

      {scheduled.length ? (
        <View className="mt-2 gap-2">
          <Text className="font-sans-medium text-[13px] text-ink">
            Scheduled reminders
          </Text>
          {scheduled.map((r) => (
            <View
              key={r.id}
              className="flex-row items-center justify-between gap-2"
            >
              <Text className="font-sans text-[13px] text-stone">
                <Ionicons name="notifications-outline" size={12} />{' '}
                {new Date(r.scheduled_for).toLocaleString(undefined, {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onPress={() => cancelRemind.mutate(r.id)}
              >
                Cancel
              </Button>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        variant="cta"
        disabled={busy}
        onPress={() => actions.edit(row)}
      >
        <Ionicons name="pencil" size={16} color={colors.card} />
        <Text className="font-sans-medium text-[15px] text-card">
          Edit your next step
        </Text>
      </Button>
      <Button
        variant="quiet"
        disabled={busy}
        onPress={() => actions.toggle(row)}
      >
        {row.status === 'completed' ? 'Reopen task' : 'Mark complete'}
      </Button>

      <Button
        variant="destructive"
        disabled={busy}
        onPress={() => actions.remove(row)}
      >
        {actions.removing ? 'Deleting…' : 'Delete task'}
      </Button>

      {actions.error || cancelRemind.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(actions.error ?? cancelRemind.error, 'Update failed')}
        </Text>
      ) : null}

      <EditNextStepSheet {...actions.sheet} />
    </WorkspacePage>
  );
}
