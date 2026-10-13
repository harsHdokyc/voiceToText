import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, Eyebrow } from '@/components/ui';
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
import { colors, fonts, space } from '@/theme';

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
      <View style={styles.center}>
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (task.isError || !task.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Eyebrow>The things you chose</Eyebrow>
      <Text style={styles.title}>{row.title}</Text>
      <Text style={styles.meta}>
        {taskStatusLabel(row.status)} · {dueLabel(row.due_at)}
      </Text>

      {row.details ? (
        <Text style={styles.details}>{row.details}</Text>
      ) : null}

      {row.source_note_id ? (
        <Link
          href={{
            pathname: '/(app)/notes/[noteId]',
            params: { noteId: row.source_note_id },
          }}
          style={styles.noteLink}
        >
          Source note →
        </Link>
      ) : (
        <Text style={styles.meta}>No source note linked.</Text>
      )}

      {scheduled.length ? (
        <View style={styles.remindBlock}>
          <Text style={styles.label}>Scheduled reminders</Text>
          {scheduled.map((r) => (
            <View key={r.id} style={styles.reminderRow}>
              <Text style={styles.meta}>
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
            <Text style={styles.ctaLabel}>Edit your next step</Text>
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
        <Text style={styles.error}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: space[5],
    gap: space[3],
    paddingBottom: space[10],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
  },
  meta: { fontFamily: fonts.sans, fontSize: 13, color: colors.stone },
  details: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  noteLink: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.cobalt,
    paddingVertical: 4,
  },
  remindBlock: { gap: space[2], marginTop: space[2] },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  ctaLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
