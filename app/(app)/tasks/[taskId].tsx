import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import {
  archiveTask,
  completeTask,
  deleteTask,
  getTask,
  reopenTask,
} from '@/features/tasks/services/tasks-service';
import { saveTaskFromEditSheet } from '@/features/tasks/services/task-edit-save';
import { taskStatusLabel } from '@/features/tasks/services/task-status';
import { dueLabel } from '@/features/tasks/services/task-due-label';
import {
  cancelReminder,
  listRemindersForTask,
} from '@/features/reminders/services/reminders-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, space } from '@/theme';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    await queryClient.invalidateQueries({ queryKey: ['reminders', taskId] });
  };

  const saveEdit = useMutation({
    mutationFn: saveTaskFromEditSheet,
    onSuccess: async () => {
      setEditOpen(false);
      await invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!task.data) throw new Error('Task missing');
      if (task.data.status === 'completed') return reopenTask(task.data.id);
      return completeTask(task.data.id);
    },
    onSuccess: invalidate,
  });

  const cancelRemind = useMutation({
    mutationFn: (reminderId: string) => cancelReminder(reminderId),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!task.data) throw new Error('Task missing');
      await archiveTask(task.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!task.data) throw new Error('Task missing');
      await deleteTask(task.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
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
  const busy =
    saveEdit.isPending ||
    toggle.isPending ||
    cancelRemind.isPending ||
    archive.isPending ||
    remove.isPending;
  const editable = row.status !== 'archived';
  const scheduled = (reminders.data ?? []).filter(
    (r) => r.status === 'scheduled',
  );

  return (
    <WorkspacePage gap={space[3]}>
      <Eyebrow>The things you chose</Eyebrow>
      <Text className="font-display text-[32px] text-ink">{row.title}</Text>
      <Text className="font-sans text-[13px] text-stone">
        {taskStatusLabel(row.status)} · {dueLabel(row.due_at)}
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

      {editable ? (
        <>
          <Button
            variant="cta"
            disabled={busy}
            onPress={() => setEditOpen(true)}
          >
            <Ionicons name="pencil" size={16} color={colors.card} />
            <Text className="font-sans-medium text-[15px] text-card">
              Edit your next step
            </Text>
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onPress={() => toggle.mutate()}
          >
            {row.status === 'completed' ? 'Reopen task' : 'Mark complete'}
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onPress={() => archive.mutate()}
          >
            Archive task
          </Button>
        </>
      ) : null}

      <Button
        variant="destructive"
        disabled={busy}
        onPress={() => remove.mutate()}
      >
        {remove.isPending ? 'Deleting…' : 'Delete task'}
      </Button>

      {toggle.error || archive.error || remove.error || cancelRemind.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(
            toggle.error ??
              archive.error ??
              remove.error ??
              cancelRemind.error,
            'Update failed',
          )}
        </Text>
      ) : null}

      <EditNextStepSheet
        open={editOpen}
        onClose={() => {
          if (!saveEdit.isPending) setEditOpen(false);
        }}
        initialTitle={row.title}
        initialDueAt={row.due_at}
        mode="task"
        busy={saveEdit.isPending}
        error={
          saveEdit.error
            ? errorMessageForUi(saveEdit.error, 'Save failed')
            : null
        }
        onSave={(draft) => {
          saveEdit.mutate({
            task: row,
            title: draft.title,
            dueAt: draft.dueAt,
            reminderHours: draft.reminderHours,
          });
        }}
      />
    </WorkspacePage>
  );
}
