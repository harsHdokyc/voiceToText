import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import {
  Button,
  EmptyState,
  Eyebrow,
  VoiceRibbon
} from '@/components/ui';
import { SuggestionReviewRow } from '@/components/work-row';
import { NoteAudioPlayer } from '@/features/notes/components/note-audio-player';
import {
  useWorkspaceWide,
  WorkspacePage,
} from '@/components/workspace-page';
import {
  formatNoteTime,
  normalizeNoteCategory
} from '@/features/notes/services/note-category';
import {
  AUDIO_DELETED_LABEL,
  canPlayNoteAudio,
  audioRetryUnavailableLabel,
  displayTranscript,
  isNoteAudioPurged,
  noteStatusLabel,
  showProcessingRetry,
} from '@/features/notes/services/note-status';
import {
  getNote,
  retryTranscription,
} from '@/features/notes/services/notes-service';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { approveSuggestionWithEdit } from '@/features/notes/services/suggestion-edit-save';
import {
  approveSuggestion,
  getSuggestions,
  isPendingSuggestion,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { errorMessageForUi } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

/**
 * Note detail — layout from ui/goals-in-motion-55 Workspace currentNote view:
 * back · category/time · title · lg:grid transcript | suggestions.
 * Edits stay available via sheet (real backend), not inline form chrome.
 */
export default function NoteDetailScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const queryClient = useQueryClient();
  const wide = useWorkspaceWide();
  const [editingSuggestion, setEditingSuggestion] =
    useState<TaskSuggestion | null>(null);

  const note = useQuery({
    queryKey: ['notes', noteId],
    queryFn: () => getNote(noteId),
    enabled: Boolean(noteId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === 'queued' ||
        status === 'transcribing' ||
        status === 'extracting' ||
        status === 'uploading'
      ) {
        return 2000;
      }
      return false;
    },
  });

  const suggestions = useQuery({
    queryKey: ['suggestions', noteId],
    queryFn: () => getSuggestions(noteId),
    enabled: Boolean(noteId) && note.data?.status === 'review_ready',
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    await queryClient.invalidateQueries({ queryKey: ['suggestions', noteId] });
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const retry = useMutation({
    mutationFn: async () => {
      if (!note.data) throw new Error('Note missing');
      await retryTranscription(note.data);
    },
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (id: string) => approveSuggestion(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectSuggestion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suggestions', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const saveSuggestionEdit = useMutation({
    mutationFn: approveSuggestionWithEdit,
    onSuccess: async () => {
      setEditingSuggestion(null);
      await invalidate();
    },
  });

  if (note.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (note.isError || !note.data) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="font-sans text-destructive">
          {errorMessageForUi(note.error, 'Note not found')}
        </Text>
      </View>
    );
  }

  const row = note.data;
  const transcript = displayTranscript(row);
  const busy =
    approve.isPending ||
    reject.isPending ||
    saveSuggestionEdit.isPending;
  const processing =
    row.status === 'queued' ||
    row.status === 'transcribing' ||
    row.status === 'extracting' ||
    row.status === 'uploading';
  const pendingSuggestions = (suggestions.data ?? []).filter((s) =>
    isPendingSuggestion(s.status),
  );
  const displayTitle = row.title?.trim() || 'A new thought';
  const audioPurged = isNoteAudioPurged(row);
  const retryBlocked = audioRetryUnavailableLabel(row);
  const showLiveProcessing = processing && !retryBlocked;

  return (
    <WorkspacePage gap={0}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6 self-start"
        onPress={() => router.replace('/(app)/notes' as Href)}
        accessibilityLabel="All notes"
      >
        <Ionicons name="arrow-back" size={18} color={colors.ink} />
        <Text className="font-sans-medium text-sm text-ink">All notes</Text>
      </Button>

      <Eyebrow color={colors.cobalt} className="mb-0">
        {normalizeNoteCategory(row.category)} / {formatNoteTime(row.created_at)}
      </Eyebrow>
      <Text
        className={cn(
          'mt-4 max-w-3xl font-display text-4xl font-medium text-ink',
          wide && 'text-[48px]',
        )}
      >
        {displayTitle}
      </Text>
      {row.status !== 'review_ready' && !processing ? (
        <Text className="mt-2 font-sans text-[13px] text-stone">
          {noteStatusLabel(row.status)}
          {row.last_error_code ? ` · ${row.last_error_code}` : ''}
        </Text>
      ) : null}

      {/* Prototype: mt-10 grid gap-10 lg:grid-cols-2 */}
      <View className={cn('mt-10 gap-10', wide && 'flex-row items-start')}>
        <View className="min-w-0 flex-1 border-t border-border pt-6">
          <Eyebrow>Transcript</Eyebrow>
          <View className="my-5 w-full min-w-0">
            {audioPurged ? (
              <Text
                className="py-3 font-sans text-sm leading-5 text-stone"
                accessibilityRole="text"
              >
                {AUDIO_DELETED_LABEL}
              </Text>
            ) : canPlayNoteAudio(row) ? (
              <NoteAudioPlayer
                noteId={row.id}
                mimeType={row.audio_mime_type}
                durationSeconds={row.audio_duration_seconds}
              />
            ) : (
              <VoiceRibbon live />
            )}
          </View>
          {showLiveProcessing ? (
            <Text className="mt-3 font-sans text-sm text-stone">
              {row.status === 'extracting'
                ? 'Extracting tasks…'
                : 'Transcribing…'}
            </Text>
          ) : (
            <Text className="font-display text-2xl leading-9 text-ink">
              “{transcript?.trim() || 'No transcript yet.'}”
            </Text>
          )}
        </View>

        <View className="min-w-0 flex-1 border-t border-border pt-6">
          <Eyebrow>Suggestions</Eyebrow>
          {row.status === 'review_ready' ? (
            suggestions.isLoading ? (
              <View className="mt-6">
                <ActivityIndicator color={colors.cobalt} />
              </View>
            ) : pendingSuggestions.length ? (
              pendingSuggestions.map((s) => (
                <SuggestionReviewRow
                  key={s.id}
                  title={s.title}
                  kindLabel={suggestionKindLabel(s.kind)}
                  dueAt={s.due_at}
                  sourceNoteId={null}
                  busy={busy}
                  onApprove={() => approve.mutate(s.id)}
                  onDismiss={() => reject.mutate(s.id)}
                  onEdit={() => setEditingSuggestion(s)}
                />
              ))
            ) : (
              <EmptyState
                title="Nothing waiting here."
                body="Your note stays safe — no pending suggestions."
              />
            )
          ) : showLiveProcessing ? (
            <Text className="mt-3 font-sans text-sm text-stone">
              Suggestions appear when processing finishes.
            </Text>
          ) : (
            <EmptyState
              title="Nothing waiting here."
              body="Process this note to extract next steps."
            />
          )}
          {approve.error ? (
            <Text className="mt-2 font-sans text-destructive">
              {errorMessageForUi(approve.error, 'Approve failed')}
            </Text>
          ) : null}
          {reject.error ? (
            <Text className="mt-2 font-sans text-destructive">
              {errorMessageForUi(reject.error, 'Reject failed')}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-10 w-full min-w-0 gap-2">
        {showProcessingRetry(row) ? (
          <View className="flex-row flex-wrap items-center gap-2">
            <Button
              variant="quiet"
              size="sm"
              disabled={retry.isPending}
              onPress={() => retry.mutate()}
            >
              {retry.isPending ? 'Retrying…' : 'Retry processing'}
            </Button>
          </View>
        ) : null}
        {retryBlocked ? (
          <Text
            className="font-sans text-sm leading-5 text-stone"
            accessibilityRole="text"
          >
            {retryBlocked}
          </Text>
        ) : null}
      </View>
      {retry.error ? (
        <Text className="mt-2 font-sans text-destructive">
          {errorMessageForUi(retry.error, 'Retry failed')}
        </Text>
      ) : null}

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
