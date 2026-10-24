import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useCapture } from '@/components/capture-sheet';
import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { NoteCardGrid } from '@/components/note-card';
import {
  Button,
  EmptyState,
  Eyebrow,
  iconPressClassName,
  VoiceRibbon,
} from '@/components/ui';
import {
  useWorkspaceDesktop,
  useWorkspaceWide,
  WorkspacePage,
} from '@/components/workspace-page';
import {
  SuggestionReviewRow,
  TaskProgressRow,
} from '@/components/work-row';
import {
  usePendingSuggestions,
  useSuggestionReview,
} from '@/features/notes/hooks/use-suggestion-review';
import { deleteNote, listNotes } from '@/features/notes/services/notes-service';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { useProfile } from '@/features/settings/hooks/use-profile';
import { useTaskActions, useTaskList } from '@/features/tasks/hooks/use-task-actions';
import { errorMessageForUi } from '@/lib/api-error';
import { invalidateWorkspace } from '@/lib/query-client';
import { cn } from '@/lib/cn';
import { colors, space } from '@/theme';

/**
 * Overview — layout mirrored from ui/goals-in-motion-55 Workspace.tsx Overview,
 * wired to live notes / suggestions / tasks.
 */
export default function OverviewScreen() {
  const { openCapture } = useCapture();
  const queryClient = useQueryClient();
  const desktop = useWorkspaceDesktop();
  const wide = useWorkspaceWide();

  const { name } = useProfile();
  const notes = useQuery({
    queryKey: ['notes'],
    queryFn: () => listNotes(),
  });
  const pending = usePendingSuggestions();
  const tasks = useTaskList({ status: 'open' });
  const review = useSuggestionReview();
  const taskActions = useTaskActions();

  const removeNote = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => invalidateWorkspace(queryClient, 'noteDeleted'),
  });
  const actionError = removeNote.error ?? review.error ?? taskActions.error;

  const pendingRows = pending.data ?? [];
  const openTasks = tasks.data ?? [];
  const recent = (notes.data ?? []).slice(0, 6);
  return (
    <WorkspacePage gap={space[6]}>
      {/* Greeting + counts — lg:grid-cols-[1fr_auto] */}
      <View className={cn('gap-6', wide && 'flex-row items-end justify-between')}>
        <View className={cn('min-w-0 gap-3', wide && 'flex-1')}>
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
        <View className={cn('min-w-0 gap-3', desktop && 'flex-1')}>
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
          className="flex-row items-center gap-1 rounded-md px-2 py-1 web:transition-colors web:duration-200 hover:bg-lime active:bg-lime/80"
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
        <View className={cn('min-w-0', wide && 'flex-1')}>
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
              className={iconPressClassName}
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
                busy={review.isBusy(s.id)}
                onApprove={() => review.approve(s)}
                onDismiss={() => review.dismiss(s)}
                onEdit={() => review.edit(s)}
              />
            ))
          ) : (
            <EmptyState
              title="All caught up."
              body="No suggestions waiting for your review."
            />
          )}
        </View>

        <View className={cn('min-w-0', wide && 'flex-1')}>
          <View className="mb-1 flex-row items-center justify-between border-b border-border pb-4">
            <Text className="font-display text-xl font-medium text-ink">
              Your next steps
            </Text>
            <Pressable
              accessibilityLabel="All tasks"
              onPress={() => router.push('/(app)/tasks' as Href)}
              hitSlop={8}
              className={iconPressClassName}
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
                kindLabel={suggestionKindLabel(t.kind)}
                dueAt={t.due_at}
                sourceNoteId={t.source_note_id}
                done={t.status === 'completed'}
                busy={taskActions.isBusy(t.id)}
                onToggleDone={() => taskActions.toggle(t)}
                onEdit={() => taskActions.edit(t)}
                onRemove={() => taskActions.remove(t)}
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

      {actionError ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(actionError, 'Update failed')}
        </Text>
      ) : null}

      <EditNextStepSheet {...taskActions.sheet} />
      <EditNextStepSheet {...review.sheet} />
    </WorkspacePage>
  );
}
