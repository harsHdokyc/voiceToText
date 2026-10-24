import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { TaskProgressRow } from '@/components/work-row';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { useTaskActions, useTaskList } from '@/features/tasks/hooks/use-task-actions';
import {
  TASK_STATUS_FILTERS,
  TASK_WHEN_DAY_FILTERS,
  taskListQueryForStatus,
  taskMatchesListFilter,
  whenFilterDayMeta,
  type TaskStatusFilter,
  type TaskWhenFilter,
} from '@/features/tasks/services/task-due-label';
import { errorMessageForUi } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

function emptyCopy(
  status: TaskStatusFilter,
  when: TaskWhenFilter,
): { title: string; body: string } {
  if (when !== 'Anytime') {
    const day =
      when === 'Today'
        ? 'today'
        : when === 'Tomorrow'
          ? 'tomorrow'
          : 'yesterday';
    return {
      title:
        when === 'Yesterday'
          ? 'Nothing was due yesterday.'
          : `Nothing due ${day}.`,
      body:
        status === 'Completed'
          ? 'No completed tasks on that day.'
          : status === 'Open'
            ? 'No open tasks on that day.'
            : 'Nothing scheduled for that day.',
    };
  }
  if (status === 'Completed') {
    return {
      title: 'Small wins go here.',
      body: 'Complete a task to see it here.',
    };
  }
  return {
    title: 'Room for your next step.',
    body: 'Approve a suggestion to add it to your list.',
  };
}

/** iOS-style status segment — 3 options, equal width (research sweet spot). */
function StatusSegment({
  value,
  onChange,
}: {
  value: TaskStatusFilter;
  onChange: (next: TaskStatusFilter) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="min-w-0 flex-1 flex-row rounded-pill border border-border bg-card p-1"
    >
      {TASK_STATUS_FILTERS.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option)}
            className={cn(
              'min-h-10 min-w-0 flex-1 items-center justify-center rounded-pill px-2',
              active && 'bg-ink',
            )}
          >
            <Text
              className={cn(
                'font-sans-medium text-xs',
                active ? 'text-paper' : 'text-ink',
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Todoist Upcoming-style day strip. Tap again to clear back to Anytime.
 * Orthogonal to status — e.g. Open + Today.
 */
function WhenStrip({
  value,
  onChange,
}: {
  value: TaskWhenFilter;
  onChange: (next: TaskWhenFilter) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-2"
      accessibilityLabel="Filter by due day"
    >
      {TASK_WHEN_DAY_FILTERS.map((option) => {
        const active = value === option;
        const meta = whenFilterDayMeta(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option}, ${meta.weekday} ${meta.day}`}
            onPress={() => onChange(active ? 'Anytime' : option)}
            className={cn(
              'min-h-[4.5rem] min-w-0 flex-1 items-center justify-center rounded-lg border border-border bg-card px-1 py-2',
              active && 'border-ink bg-ink',
            )}
          >
            <Text
              className={cn(
                'font-mono text-[10px] uppercase tracking-[1.2px]',
                active ? 'text-paper/70' : 'text-stone',
              )}
            >
              {meta.weekday}
            </Text>
            <Text
              className={cn(
                'mt-0.5 font-display text-2xl leading-7',
                active ? 'text-paper' : 'text-ink',
              )}
            >
              {meta.day}
            </Text>
            <Text
              className={cn(
                'mt-0.5 font-sans text-[11px]',
                active ? 'text-paper/80' : 'text-stone',
              )}
              numberOfLines={1}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TasksScreen() {
  const [status, setStatus] = useState<TaskStatusFilter>('Open');
  const [when, setWhen] = useState<TaskWhenFilter>('Anytime');
  const tasks = useTaskList(taskListQueryForStatus(status));
  const actions = useTaskActions();

  const rows = (tasks.data ?? []).filter((task) =>
    taskMatchesListFilter(task, status, when),
  );

  return (
    <WorkspacePage>
      <View className="min-w-0 flex-row flex-wrap items-end justify-between gap-3">
        <View className="min-w-0 flex-1 gap-2">
          <Eyebrow>The things you chose</Eyebrow>
          <Text className="font-display text-4xl text-ink">
            Make <Text className="font-sans-italic text-cobalt">progress.</Text>
          </Text>
        </View>
        <Button variant="cta" size="sm" onPress={actions.startCreate}>
          <Ionicons name="add" size={16} color={colors.card} />
          <Text className="font-sans-medium text-[14px] text-card">New task</Text>
        </Button>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <StatusSegment value={status} onChange={setStatus} />
        </View>
        <WhenStrip value={when} onChange={setWhen} />
        {when !== 'Anytime' ? (
          <Text className="font-sans text-xs text-stone">
            Showing {when.toLowerCase()} · tap again to clear
          </Text>
        ) : null}
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
        <EmptyState {...emptyCopy(status, when)} />
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
