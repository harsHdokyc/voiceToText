import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import {
  Button,
  EmptyState,
  Eyebrow,
  Sheet,
  TextField,
  VoiceRibbon,
} from '@/components/ui';
import {
  useWorkspaceWide,
  WorkspacePage,
} from '@/components/workspace-page';
import { SuggestionReviewRow } from '@/components/work-row';
import {
  NOTE_CATEGORIES,
  formatNoteTime,
  normalizeNoteCategory,
  type NoteCategory,
} from '@/features/notes/services/note-category';
import {
  archiveNote,
  getNote,
  retryTranscription,
  updateNoteContent,
} from '@/features/notes/services/notes-service';
import {
  canTransitionNoteStatus,
  displayTranscript,
  isRetryableProcessing,
  noteStatusLabel,
} from '@/features/notes/services/note-status';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { approveSuggestionWithEdit } from '@/features/notes/services/suggestion-edit-save';
import {
  approveSuggestion,
  getSuggestions,
  isPendingSuggestion,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, space } from '@/theme';

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
  const [editOpen, setEditOpen] = useState(false);

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

  const [title, setTitle] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [category, setCategory] = useState<NoteCategory>('Ideas');

  useEffect(() => {
    if (!note.data) return;
    setTitle(note.data.title ?? '');
    setTranscriptDraft(displayTranscript(note.data) ?? '');
    setCategory(normalizeNoteCategory(note.data.category));
  }, [note.data]);

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

  const saveContent = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error('Note missing');
      return updateNoteContent(noteId, {
        title,
        edited_transcript: transcriptDraft,
        category,
      });
    },
    onSuccess: async () => {
      setEditOpen(false);
      await invalidate();
    },
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!note.data) throw new Error('Note missing');
      await archiveNote(note.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.replace('/(app)/notes' as Href);
    },
  });

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

  const removeNote = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error('Note missing');
      await deleteNote(noteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      router.replace('/(app)/notes' as Href);
    },
  });

  if (note.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (note.isError || !note.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
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
    saveContent.isPending ||
    archive.isPending ||
    saveSuggestionEdit.isPending ||
    removeNote.isPending;
  const processing =
    row.status === 'queued' ||
    row.status === 'transcribing' ||
    row.status === 'extracting' ||
    row.status === 'uploading';
  const canArchive = canTransitionNoteStatus(row.status, 'archived');
  const pendingSuggestions = (suggestions.data ?? []).filter((s) =>
    isPendingSuggestion(s.status),
  );
  const displayTitle = row.title?.trim() || 'A new thought';

  return (
    <WorkspacePage gap={0}>
      <Button
        variant="ghost"
        size="sm"
        style={styles.back}
        onPress={() => router.replace('/(app)/notes' as Href)}
        accessibilityLabel="All notes"
      >
        <Ionicons name="arrow-back" size={18} color={colors.ink} />
        <Text style={styles.backLabel}>All notes</Text>
      </Button>

      <Eyebrow color={colors.cobalt} style={styles.metaEyebrow}>
        {normalizeNoteCategory(row.category)} / {formatNoteTime(row.created_at)}
      </Eyebrow>
      <Text style={[styles.title, wide && styles.titleWide]}>{displayTitle}</Text>
      {row.status !== 'review_ready' && !processing ? (
        <Text style={styles.status}>
          {noteStatusLabel(row.status)}
          {row.last_error_code ? ` · ${row.last_error_code}` : ''}
        </Text>
      ) : null}

      {/* Prototype: mt-10 grid gap-10 lg:grid-cols-2 */}
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={styles.panel}>
          <Eyebrow>Transcript</Eyebrow>
          <View style={styles.ribbon}>
            {/* Beat always — matches product ribbon feel on detail */}
            <VoiceRibbon live />
          </View>
          {processing ? (
            <Text style={styles.processing}>
              {row.status === 'extracting'
                ? 'Extracting tasks…'
                : 'Transcribing…'}
            </Text>
          ) : (
            <Text style={styles.transcript}>
              “{transcript?.trim() || 'No transcript yet.'}”
            </Text>
          )}
        </View>

        <View style={styles.panel}>
          <Eyebrow>Suggestions</Eyebrow>
          {row.status === 'review_ready' ? (
            suggestions.isLoading ? (
              <ActivityIndicator
                color={colors.cobalt}
                style={styles.suggestionsLoad}
              />
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
          ) : processing ? (
            <Text style={styles.processing}>
              Suggestions appear when processing finishes.
            </Text>
          ) : (
            <EmptyState
              title="Nothing waiting here."
              body="Process this note to extract next steps."
            />
          )}
          {approve.error ? (
            <Text style={styles.error}>
              {errorMessageForUi(approve.error, 'Approve failed')}
            </Text>
          ) : null}
          {reject.error ? (
            <Text style={styles.error}>
              {errorMessageForUi(reject.error, 'Reject failed')}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        {row.status !== 'archived' ? (
          <Button
            variant="quiet"
            size="sm"
            disabled={busy}
            onPress={() => setEditOpen(true)}
          >
            Edit note
          </Button>
        ) : null}
        {isRetryableProcessing(row.status) ? (
          <Button
            variant="quiet"
            size="sm"
            disabled={retry.isPending}
            onPress={() => retry.mutate()}
          >
            {retry.isPending ? 'Retrying…' : 'Retry processing'}
          </Button>
        ) : null}
        {canArchive ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onPress={() => archive.mutate()}
          >
            Archive
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={removeNote.isPending}
          onPress={() => removeNote.mutate()}
          accessibilityLabel="Delete note"
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Button>
      </View>
      {retry.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(retry.error, 'Retry failed')}
        </Text>
      ) : null}
      {removeNote.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(removeNote.error, 'Delete failed')}
        </Text>
      ) : null}
      {archive.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(archive.error, 'Archive failed')}
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

      <Sheet
        open={editOpen}
        onClose={() => {
          if (!saveContent.isPending) setEditOpen(false);
        }}
        title="Edit note"
        description="Update title, category, or transcript."
      >
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.filters}>
          {NOTE_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={category === c ? 'ink' : 'quiet'}
              size="sm"
              disabled={saveContent.isPending}
              onPress={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Title</Text>
        <TextField
          value={title}
          onChangeText={setTitle}
          editable={!saveContent.isPending}
          placeholder="Voice note"
        />
        <Text style={styles.fieldLabel}>Transcript</Text>
        <TextField
          style={styles.transcriptField}
          value={transcriptDraft}
          onChangeText={setTranscriptDraft}
          editable={!saveContent.isPending}
          multiline
          placeholder="No transcript yet."
        />
        <Button
          variant="cta"
          disabled={saveContent.isPending}
          onPress={() => saveContent.mutate()}
        >
          {saveContent.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {saveContent.error ? (
          <Text style={styles.error}>
            {errorMessageForUi(saveContent.error, 'Save failed')}
          </Text>
        ) : null}
      </Sheet>
    </WorkspacePage>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  back: {
    alignSelf: 'flex-start',
    marginLeft: -space[2],
    marginBottom: space[6],
  },
  backLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
  },
  metaEyebrow: { marginBottom: 0 },
  title: {
    marginTop: space[4],
    maxWidth: 768,
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: '500',
    color: colors.ink,
  },
  titleWide: { fontSize: 48 },
  status: {
    marginTop: space[2],
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.stone,
  },
  columns: {
    marginTop: space[10],
    gap: space[10],
  },
  columnsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    flex: 1,
    minWidth: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[6],
  },
  ribbon: { marginVertical: space[5], width: '100%', minWidth: 0 },
  transcript: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 36,
    color: colors.ink,
  },
  processing: {
    marginTop: space[3],
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
  },
  suggestionsLoad: { marginTop: space[6] },
  footer: {
    marginTop: space[10],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    alignItems: 'center',
  },
  deleteLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.destructive,
  },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.stone,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  transcriptField: { minHeight: 120, textAlignVertical: 'top' as const },
  error: { fontFamily: fonts.sans, color: colors.destructive, marginTop: space[2] },
});
