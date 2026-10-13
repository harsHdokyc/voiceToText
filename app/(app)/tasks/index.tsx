import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { TaskProgressRow } from '@/components/work-row';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import {
  archiveTask,
  completeTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { saveTaskFromEditSheet } from '@/features/tasks/services/task-edit-save';
import {
  TASK_LIST_FILTERS,
  taskListQueryForFilter,
  type TaskListFilter,
} from '@/features/tasks/services/task-due-label';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, space } from '@/theme';

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TaskListFilter>('Open');
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const params = taskListQueryForFilter(filter);
  const tasks = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => listTasks(params),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const toggleComplete = useMutation({
    mutationFn: async (task: TaskRow) => {
      if (task.status === 'completed') return reopenTask(task.id);
      return completeTask(task.id);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (taskId: string) => archiveTask(taskId),
    onSuccess: invalidate,
  });

  const saveEdit = useMutation({
    mutationFn: saveTaskFromEditSheet,
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const rows = tasks.data ?? [];
  const busy =
    toggleComplete.isPending || remove.isPending || saveEdit.isPending;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Eyebrow>The things you chose</Eyebrow>
      <Text style={styles.title}>
        Make <Text style={styles.accent}>progress.</Text>
      </Text>

      <View style={styles.filters}>
        {TASK_LIST_FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'ink' : 'quiet'}
            size="sm"
            onPress={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </View>

      <Button
        variant="quiet"
        size="sm"
        style={styles.newBtn}
        onPress={() => router.push('/(app)/tasks/new' as Href)}
      >
        New task
      </Button>

      {tasks.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : tasks.isError ? (
        <Text style={styles.error}>
          {errorMessageForUi(tasks.error, 'Failed to load tasks')}
        </Text>
      ) : rows.length ? (
        <View style={styles.list}>
          {rows.map((task) => (
            <TaskProgressRow
              key={task.id}
              title={task.title}
              kindLabel="Task"
              dueAt={task.due_at}
              sourceNoteId={task.source_note_id}
              done={task.status === 'completed'}
              busy={busy}
              onToggleDone={() => toggleComplete.mutate(task)}
              onEdit={() => setEditing(task)}
              onRemove={() => remove.mutate(task.id)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title={
            filter === 'Completed'
              ? 'Small wins go here.'
              : 'Room for your next step.'
          }
          body={
            filter === 'Completed'
              ? 'Complete a task to see it here.'
              : 'Approve a suggestion to add it to your list.'
          }
        />
      )}

      {toggleComplete.error || remove.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(
            toggleComplete.error ?? remove.error,
            'Update failed',
          )}
        </Text>
      ) : null}

      <EditNextStepSheet
        open={editing !== null}
        onClose={() => {
          if (!saveEdit.isPending) setEditing(null);
        }}
        initialTitle={editing?.title ?? ''}
        initialDueAt={editing?.due_at ?? null}
        mode="task"
        busy={saveEdit.isPending}
        error={
          saveEdit.error
            ? errorMessageForUi(saveEdit.error, 'Save failed')
            : null
        }
        onSave={(draft) => {
          if (!editing) return;
          saveEdit.mutate({
            task: editing,
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
    gap: space[4],
    paddingBottom: space[10],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
  },
  accent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  newBtn: { alignSelf: 'flex-start' },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
