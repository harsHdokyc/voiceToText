import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, EmptyState, Eyebrow, TextField, VoiceRibbon } from '@/components/ui';
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
import {
  approveSuggestion,
  buildSuggestionEdits,
  getSuggestions,
  isPendingSuggestion,
  rejectSuggestion,
  type SuggestionKind,
  type TaskPriority,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, radius, space } from '@/theme';

const KINDS: SuggestionKind[] = [
  'task',
  'reminder',
  'idea',
  'question',
  'follow_up',
];

export default function NoteDetailScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const queryClient = useQueryClient();

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
      await queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const approve = useMutation({
    mutationFn: async ({
      suggestion,
      draft,
    }: {
      suggestion: TaskSuggestion;
      draft: {
        title: string;
        details: string;
        kind: SuggestionKind;
        due_at: string | null;
        priority: TaskPriority | null;
      };
    }) => {
      const edits = buildSuggestionEdits(suggestion, draft);
      await approveSuggestion(suggestion.id, edits);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suggestions', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      await queryClient.invalidateQueries({ queryKey: ['notes', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const reject = useMutation({
    mutationFn: async (suggestionId: string) => {
      await rejectSuggestion(suggestionId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suggestions', noteId] });
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
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
  const actionBusy =
    approve.isPending ||
    reject.isPending ||
    saveContent.isPending ||
    archive.isPending;
  const processing =
    row.status === 'queued' ||
    row.status === 'transcribing' ||
    row.status === 'extracting' ||
    row.status === 'uploading';
  const canArchive = canTransitionNoteStatus(row.status, 'archived');
  const pendingSuggestions = (suggestions.data ?? []).filter((s) =>
    isPendingSuggestion(s.status),
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Button
        variant="ghost"
        size="sm"
        style={styles.back}
        onPress={() => router.replace('/(app)/notes' as Href)}
      >
        ← All notes
      </Button>

      <Eyebrow color={colors.cobalt}>
        {normalizeNoteCategory(row.category)} / {formatNoteTime(row.created_at)}
      </Eyebrow>
      <Text style={styles.title}>{row.title?.trim() || 'A new thought'}</Text>
      <Text style={styles.status}>
        {noteStatusLabel(row.status)}
        {row.last_error_code ? ` · ${row.last_error_code}` : ''}
      </Text>

      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.filters}>
        {NOTE_CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={category === c ? 'ink' : 'quiet'}
            size="sm"
            disabled={actionBusy || row.status === 'archived'}
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
        editable={!actionBusy && row.status !== 'archived'}
        placeholder="Voice note"
      />

      <View style={styles.panel}>
        <Eyebrow>Transcript</Eyebrow>
        <View style={styles.ribbon}>
          <VoiceRibbon live={processing} />
        </View>
        {processing ? (
          <Text style={styles.meta}>
            {row.status === 'extracting'
              ? 'Extracting tasks…'
              : 'Transcribing…'}
          </Text>
        ) : (
          <TextField
            style={styles.transcript}
            value={transcriptDraft}
            onChangeText={setTranscriptDraft}
            editable={!actionBusy && row.status !== 'archived'}
            multiline
            placeholder="No transcript yet."
          />
        )}
      </View>

      {row.status !== 'archived' ? (
        <Button
          variant="cta"
          disabled={actionBusy}
          onPress={() => saveContent.mutate()}
        >
          {saveContent.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      ) : null}
      {saveContent.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(saveContent.error, 'Save failed')}
        </Text>
      ) : null}

      <View style={styles.panel}>
        <Eyebrow>Suggestions</Eyebrow>
        {row.status === 'review_ready' ? (
          suggestions.isLoading ? (
            <Text style={styles.meta}>Loading suggestions…</Text>
          ) : pendingSuggestions.length ? (
            pendingSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                busy={actionBusy}
                onApprove={(draft) => approve.mutate({ suggestion, draft })}
                onReject={() => reject.mutate(suggestion.id)}
              />
            ))
          ) : (
            <EmptyState
              title="Nothing waiting here."
              body="No pending suggestions for this note."
            />
          )
        ) : processing ? (
          <Text style={styles.meta}>Suggestions appear when processing finishes.</Text>
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

      {isRetryableProcessing(row.status) ? (
        <Button
          variant="quiet"
          disabled={retry.isPending}
          onPress={() => retry.mutate()}
        >
          {retry.isPending ? 'Retrying…' : 'Retry processing'}
        </Button>
      ) : null}
      {retry.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(retry.error, 'Retry failed')}
        </Text>
      ) : null}

      {canArchive ? (
        <Button
          variant="quiet"
          disabled={actionBusy}
          onPress={() => archive.mutate()}
        >
          Archive note
        </Button>
      ) : null}

      <Button
        variant="destructive"
        disabled={removeNote.isPending}
        onPress={() => removeNote.mutate()}
      >
        {removeNote.isPending ? 'Deleting…' : 'Delete note'}
      </Button>
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
    </ScrollView>
  );
}

function SuggestionCard(props: {
  suggestion: TaskSuggestion;
  busy: boolean;
  onApprove: (draft: {
    title: string;
    details: string;
    kind: SuggestionKind;
    due_at: string | null;
    priority: TaskPriority | null;
  }) => void;
  onReject: () => void;
}) {
  const { suggestion, busy, onApprove, onReject } = props;
  const pending = isPendingSuggestion(suggestion.status);
  const [title, setTitle] = useState(suggestion.title);
  const [details, setDetails] = useState(suggestion.details ?? '');
  const [kind, setKind] = useState(suggestion.kind);
  const [priority, setPriority] = useState<TaskPriority | null>(
    suggestion.priority,
  );
  const [dueLocal, setDueLocal] = useState(
    suggestion.due_at ? suggestion.due_at.slice(0, 10) : '',
  );

  return (
    <View style={styles.suggestionCard}>
      {pending ? (
        <>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextField
            value={title}
            onChangeText={setTitle}
            editable={!busy}
          />
          <Text style={styles.fieldLabel}>Details</Text>
          <TextField
            style={styles.transcript}
            value={details}
            onChangeText={setDetails}
            editable={!busy}
            multiline
          />
          <Text style={styles.fieldLabel}>Kind</Text>
          <View style={styles.filters}>
            {KINDS.map((k) => (
              <Button
                key={k}
                variant={kind === k ? 'ink' : 'quiet'}
                size="sm"
                disabled={busy}
                onPress={() => setKind(k)}
              >
                {k}
              </Button>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.filters}>
            {([null, 'low', 'normal', 'high'] as const).map((p) => (
              <Button
                key={p ?? 'none'}
                variant={priority === p ? 'ink' : 'quiet'}
                size="sm"
                disabled={busy}
                onPress={() => setPriority(p)}
              >
                {p ?? 'none'}
              </Button>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Due (YYYY-MM-DD)</Text>
          <TextField
            value={dueLocal}
            onChangeText={setDueLocal}
            editable={!busy}
            placeholder="optional"
            autoCapitalize="none"
          />
        </>
      ) : (
        <>
          <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
          {suggestion.details ? (
            <Text style={styles.meta}>{suggestion.details}</Text>
          ) : null}
        </>
      )}

      <Text style={styles.meta}>
        {suggestion.kind.replaceAll('_', ' ')} · {suggestion.confidence}
      </Text>
      <Text style={styles.quote}>“{suggestion.source_quote}”</Text>

      {pending ? (
        <View style={styles.suggestionActions}>
          <Button
            variant="cta"
            size="sm"
            disabled={busy}
            onPress={() =>
              onApprove({
                title,
                details,
                kind,
                priority,
                due_at: dueLocal.trim()
                  ? new Date(`${dueLocal.trim()}T12:00:00.000Z`).toISOString()
                  : null,
              })
            }
          >
            Approve
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onPress={onReject}>
            Dismiss
          </Button>
        </View>
      ) : null}
    </View>
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
  back: { alignSelf: 'flex-start', marginLeft: -space[2] },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  status: { fontFamily: fonts.sans, fontSize: 13, color: colors.stone },
  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.stone,
    marginTop: space[2],
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  panel: {
    marginTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[4],
    gap: space[3],
  },
  ribbon: { marginVertical: space[2] },
  transcript: { minHeight: 120, textAlignVertical: 'top' as const },
  meta: { fontFamily: fonts.sans, fontSize: 13, color: colors.stone },
  error: { fontFamily: fonts.sans, color: colors.destructive },
  suggestionCard: {
    marginTop: space[2],
    padding: space[4],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space[2],
  },
  suggestionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  quote: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.stone,
    fontStyle: 'italic',
  },
  suggestionActions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
});
