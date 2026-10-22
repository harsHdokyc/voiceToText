import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { TaskProgressRow } from '@/components/work-row';
import {
  archiveTask,
  completeTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import {
  createTaskFromSheet,
  saveTaskFromEditSheet,
} from '@/features/tasks/services/task-edit-save';
import {
  TASK_LIST_FILTERS,
  taskListQueryForFilter,
  type TaskListFilter,
} from '@/features/tasks/services/task-due-label';
import { errorMessageForUi } from '@/lib/api-error';
import { colors } from '@/theme';

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TaskListFilter>('Open');
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);

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

  const create = useMutation({
    mutationFn: createTaskFromSheet,
    onSuccess: async () => {
      setCreating(false);
      await invalidate();
    },
  });

  const rows = tasks.data ?? [];
  const busy =
    toggleComplete.isPending || remove.isPending || saveEdit.isPending;
  const sheetMutation = creating ? create : saveEdit;

  return (
    <WorkspacePage>
      <View className="flex-row flex-wrap items-end justify-between gap-4">
        <View className="min-w-0 gap-2">
          <Eyebrow>The things you chose</Eyebrow>
          <Text className="font-display text-4xl text-ink">
            Make <Text className="font-sans-italic text-cobalt">progress.</Text>
          </Text>
        </View>
        <Button variant="cta" size="lg" onPress={() => setCreating(true)}>
          <Ionicons name="add" size={18} color={colors.card} />
          <Text className="font-sans-medium text-[15px] text-card">New task</Text>
        </Button>
      </View>

      <View className="flex-row flex-wrap gap-2">
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

      {tasks.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : tasks.isError ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(tasks.error, 'Failed to load tasks')}
        </Text>
      ) : rows.length ? (
        <View className="border-t border-border">
          {rows.map((task) => (
            <TaskProgressRow
              key={task.id}
              title={task.title}
              kindLabel={suggestionKindLabel(task.kind)}
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
        <Text className="font-sans text-destructive">
          {errorMessageForUi(
            toggleComplete.error ?? remove.error,
            'Update failed',
          )}
        </Text>
      ) : null}

      <EditNextStepSheet
        open={creating || editing !== null}
        onClose={() => {
          if (sheetMutation.isPending) return;
          setCreating(false);
          setEditing(null);
          create.reset();
        }}
        initialTitle={editing?.title ?? ''}
        initialDueAt={editing?.due_at ?? null}
        mode={creating ? 'create' : 'task'}
        busy={sheetMutation.isPending}
        error={
          sheetMutation.error
            ? errorMessageForUi(
                sheetMutation.error,
                creating ? 'Create failed' : 'Save failed',
              )
            : null
        }
        onSave={(draft) => {
          if (creating) {
            create.mutate(draft);
            return;
          }
          if (!editing) return;
          saveEdit.mutate({
            task: editing,
            title: draft.title,
            dueAt: draft.dueAt,
            reminderHours: draft.reminderHours,
          });
        }}
      />
    </WorkspacePage>
  );
}
