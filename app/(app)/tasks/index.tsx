import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { TaskProgressRow } from '@/components/work-row';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { useTaskActions, useTaskList } from '@/features/tasks/hooks/use-task-actions';
import {
  TASK_LIST_FILTERS,
  taskListQueryForFilter,
  type TaskListFilter,
} from '@/features/tasks/services/task-due-label';
import { errorMessageForUi } from '@/lib/api-error';
import { colors } from '@/theme';

export default function TasksScreen() {
  const [filter, setFilter] = useState<TaskListFilter>('Open');
  const tasks = useTaskList(taskListQueryForFilter(filter));
  const actions = useTaskActions();

  const rows = tasks.data ?? [];

  return (
    <WorkspacePage>
      <View className="flex-row flex-wrap items-end justify-between gap-4">
        <View className="min-w-0 gap-2">
          <Eyebrow>The things you chose</Eyebrow>
          <Text className="font-display text-4xl text-ink">
            Make <Text className="font-sans-italic text-cobalt">progress.</Text>
          </Text>
        </View>
        <Button variant="cta" size="lg" onPress={actions.startCreate}>
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
              busy={actions.isBusy(task.id)}
              onToggleDone={() => actions.toggle(task)}
              onEdit={() => actions.edit(task)}
              onRemove={() => actions.remove(task)}
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

      {actions.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(actions.error, 'Update failed')}
        </Text>
      ) : null}

      <EditNextStepSheet {...actions.sheet} />
    </WorkspacePage>
  );
}
