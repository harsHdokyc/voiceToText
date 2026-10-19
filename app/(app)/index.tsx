import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useCapture } from '@/components/capture-sheet';
import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { NoteCardGrid } from '@/components/note-card';
import { Button, EmptyState, Eyebrow, VoiceRibbon } from '@/components/ui';
import {
  useWorkspaceDesktop,
  useWorkspaceWide,
  WorkspacePage,
} from '@/components/workspace-page';
import {
  SuggestionReviewRow,
  TaskProgressRow,
} from '@/components/work-row';
import { listNotes } from '@/features/notes/services/notes-service';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { approveSuggestionWithEdit } from '@/features/notes/services/suggestion-edit-save';
import {
  approveSuggestion,
  listPendingSuggestions,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { greetingName } from '@/features/settings/services/greeting-name';
import { getOwnProfile } from '@/features/settings/services/profile-service';
import { saveTaskFromEditSheet } from '@/features/tasks/services/task-edit-save';
import {
  archiveTask,
  completeTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { errorMessageForUi } from '@/lib/api-error';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/cn';
import { colors, space } from '@/theme';

/**
 * Overview — layout mirrored from ui/goals-in-motion-55 Workspace.tsx Overview,
 * wired to live notes / suggestions / tasks.
 */
export default function OverviewScreen() {
  const { user } = useAuth();
  const { openCapture } = useCapture();
  const queryClient = useQueryClient();
  const desktop = useWorkspaceDesktop();
  const wide = useWorkspaceWide();
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [editingSuggestion, setEditingSuggestion] =
    useState<TaskSuggestion | null>(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: getOwnProfile });
  const notes = useQuery({
    queryKey: ['notes', ''],
    queryFn: () => listNotes(),
  });
  const pending = useQuery({
    queryKey: ['suggestions', 'pending'],
    queryFn: () => listPendingSuggestions(20),
  });
  const tasks = useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: () => listTasks({ status: 'open' }),
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const removeNote = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: invalidateAll,
  });
  const approve = useMutation({
    mutationFn: (id: string) => approveSuggestion(id),
    onSuccess: invalidateAll,
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectSuggestion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
  const toggleTask = useMutation({
    mutationFn: async (task: TaskRow) => {
      if (task.status === 'completed') return reopenTask(task.id);
      return completeTask(task.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const removeTask = useMutation({
    mutationFn: (id: string) => archiveTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const saveTaskEdit = useMutation({
    mutationFn: saveTaskFromEditSheet,
    onSuccess: async () => {
      setEditingTask(null);
      await invalidateAll();
    },
  });
  const saveSuggestionEdit = useMutation({
    mutationFn: approveSuggestionWithEdit,
    onSuccess: async () => {
      setEditingSuggestion(null);
      await invalidateAll();
    },
  });

  const name = greetingName(profile.data?.display_name, user?.email);
  const pendingRows = pending.data ?? [];
  const openTasks = tasks.data ?? [];
  const recent = (notes.data ?? []).slice(0, 6);
  const busy =
    approve.isPending ||
    reject.isPending ||
    toggleTask.isPending ||
    removeTask.isPending ||
    saveTaskEdit.isPending ||
    saveSuggestionEdit.isPending;
  return (
    <WorkspacePage gap={space[6]}>
      {/* Greeting + counts — lg:grid-cols-[1fr_auto] */}
      <View className={cn('gap-6', wide && 'flex-row items-end justify-between')}>
        <View className="min-w-0 flex-1 gap-3">
          <Eyebrow>A little room to think</Eyebrow>
          <Text
            className={cn(
              'font-display text-[32px] font-medium leading-[38px] text-ink',
              desktop && 'text-[48px] leading-[54px]',
            )}
          >
            Good to see you,{' '}
            <Text className="font-sans-italic text-cobalt">{name}.</Text>
          </Text>
          <Text className="font-sans text-base text-stone">
            Your thoughts have somewhere to go.
          </Text>
        </View>
        <View className="flex-row gap-8">
          <View>
            <Text className="font-display text-[32px] text-ink">
              {String(pendingRows.length).padStart(2, '0')}
            </Text>
            <Text className="mt-1 font-sans text-xs text-stone">To review</Text>
          </View>
          <View>
            <Text className="font-display text-[32px] text-ink">
              {String(openTasks.length).padStart(2, '0')}
            </Text>
            <Text className="mt-1 font-sans text-xs text-stone">Next steps</Text>
          </View>
        </View>
      </View>

      {/* Cobalt band — md: two columns copy | lime ribbon */}
      <View
        className={cn(
          'gap-4 overflow-hidden rounded-lg bg-cobalt p-5',
          desktop && 'flex-row items-center gap-6 p-8',
        )}
      >
        <View className="min-w-0 flex-1 gap-3">
          <Eyebrow color="rgba(255,255,255,0.7)">
            From thought to follow-through
          </Eyebrow>
          <Text
            className={cn(
              'font-display text-[28px] font-medium text-card',
              desktop && 'text-[40px]',
            )}
          >
            What’s on your mind?
          </Text>
          <Text className="max-w-xs font-sans text-sm text-white/75">
            The first version doesn’t need to be perfect.
          </Text>
          <Button
            variant="lime"
            size="lg"
            className="mt-3 self-start"
            onPress={openCapture}
          >
            <Ionicons name="mic" size={18} color={colors.ink} />
            <Text className="font-sans-medium text-sm text-ink">New voice note</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.ink} />
          </Button>
        </View>
        <View
          className={cn('min-h-[72px]', desktop && 'min-w-0 flex-[0.7]')}
        >
          <VoiceRibbon color={colors.lime} />
        </View>
      </View>

      {/* Recent thoughts */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-display text-xl font-medium text-ink">
          Recent thoughts
        </Text>
        <Pressable
          onPress={() => router.push('/(app)/notes' as Href)}
          className="flex-row items-center gap-1"
        >
          <Text className="font-sans text-sm text-cobalt">All notes</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.cobalt} />
        </Pressable>
      </View>
      {notes.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : notes.isError ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(notes.error, 'Failed to load notes')}
        </Text>
      ) : recent.length ? (
        <NoteCardGrid
          notes={recent}
          onDelete={(id) => removeNote.mutate(id)}
        />
      ) : (
        <EmptyState
          title="No notes yet."
          body="Capture a thought to see it here."
        />
      )}

      {/* Waiting + next steps — lg: 2 cols */}
      <View className={cn('mt-2 gap-10', wide && 'flex-row')}>
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-center justify-between border-b border-border pb-4">
            <Text className="font-display text-xl font-medium text-ink">
              Waiting for your call{' '}
              <Text className="font-sans text-sm text-cobalt">
                {pendingRows.length}
              </Text>
            </Text>
            <Pressable
              accessibilityLabel="All suggestions"
              onPress={() => router.push('/(app)/suggestions' as Href)}
              hitSlop={8}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {pending.isLoading ? (
            <ActivityIndicator color={colors.cobalt} />
          ) : pending.isError ? (
            <Text className="font-sans text-destructive">
              {errorMessageForUi(pending.error, 'Failed to load suggestions')}
            </Text>
          ) : pendingRows.length ? (
            pendingRows.slice(0, 2).map((s) => (
              <SuggestionReviewRow
                key={s.id}
                title={s.title}
                kindLabel={suggestionKindLabel(s.kind)}
                dueAt={s.due_at}
                sourceNoteId={s.note_id}
                busy={busy}
                onApprove={() => approve.mutate(s.id)}
                onDismiss={() => reject.mutate(s.id)}
                onEdit={() => setEditingSuggestion(s)}
              />
            ))
          ) : (
            <EmptyState
              title="All caught up."
              body="No suggestions waiting for your review."
            />
          )}
        </View>

        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-center justify-between border-b border-border pb-4">
            <Text className="font-display text-xl font-medium text-ink">
              Your next steps
            </Text>
            <Pressable
              accessibilityLabel="All tasks"
              onPress={() => router.push('/(app)/tasks' as Href)}
              hitSlop={8}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {tasks.isLoading ? (
            <ActivityIndicator color={colors.cobalt} />
          ) : tasks.isError ? (
            <Text className="font-sans text-destructive">
              {errorMessageForUi(tasks.error, 'Failed to load tasks')}
            </Text>
          ) : openTasks.length ? (
            openTasks.slice(0, 3).map((t) => (
              <TaskProgressRow
                key={t.id}
                title={t.title}
                kindLabel="Task"
                dueAt={t.due_at}
                sourceNoteId={t.source_note_id}
                done={t.status === 'completed'}
                busy={busy}
                onToggleDone={() => toggleTask.mutate(t)}
                onEdit={() => setEditingTask(t)}
                onRemove={() => removeTask.mutate(t.id)}
              />
            ))
          ) : (
            <EmptyState
              title="A clean slate."
              body="Approved suggestions will appear here."
            />
          )}
        </View>
      </View>

      <EditNextStepSheet
        open={editingTask !== null}
        onClose={() => {
          if (!saveTaskEdit.isPending) setEditingTask(null);
        }}
        initialTitle={editingTask?.title ?? ''}
        initialDueAt={editingTask?.due_at ?? null}
        mode="task"
        busy={saveTaskEdit.isPending}
        error={
          saveTaskEdit.error
            ? errorMessageForUi(saveTaskEdit.error, 'Save failed')
            : null
        }
        onSave={(draft) => {
          if (!editingTask) return;
          saveTaskEdit.mutate({
            task: editingTask,
            title: draft.title,
            dueAt: draft.dueAt,
            reminderHours: draft.reminderHours,
          });
        }}
      />
      <EditNextStepSheet
        open={editingSuggestion !== null}
        onClose={() => {
          if (!saveSuggestionEdit.isPending) setEditingSuggestion(null);
        }}
        initialTitle={editingSuggestion?.title ?? ''}
        initialDueAt={editingSuggestion?.due_at ?? null}
        mode="suggestion"
        busy={saveSuggestionEdit.isPending}
        error={
          saveSuggestionEdit.error
            ? errorMessageForUi(saveSuggestionEdit.error, 'Save failed')
            : null
        }
        onSave={(draft) => {
          if (!editingSuggestion) return;
          saveSuggestionEdit.mutate({
            suggestion: editingSuggestion,
            title: draft.title,
            dueAt: draft.dueAt,
            reminderHours: draft.reminderHours,
          });
        }}
      />
    </WorkspacePage>
  );
}
