import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

  useEffect(() => {
    if (!note.data) return;
    setTitle(note.data.title ?? '');
    setTranscriptDraft(displayTranscript(note.data) ?? '');
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
      router.replace('/(app)');
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
    },
  });

  const removeNote = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error('Note missing');
      await deleteNote(noteId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.replace('/(app)');
    },
  });

  if (note.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
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
    row.status === 'extracting';
  const canArchive = canTransitionNoteStatus(row.status, 'archived');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>Status: {row.status.replaceAll('_', ' ')}</Text>
      {row.last_error_code ? (
        <Text style={styles.error}>Error: {row.last_error_code}</Text>
      ) : null}

      <Text style={styles.fieldLabel}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        editable={!actionBusy && row.status !== 'archived'}
        placeholder="Voice note"
      />

      <Text style={styles.section}>Transcript</Text>
      {processing ? (
        <Text style={styles.meta}>
          {row.status === 'extracting' ? 'Extracting tasks…' : 'Transcribing…'}
        </Text>
      ) : (
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={transcriptDraft}
          onChangeText={setTranscriptDraft}
          editable={!actionBusy && row.status !== 'archived'}
          multiline
          placeholder="No transcript yet."
        />
      )}

      {row.status !== 'archived' ? (
        <Pressable
          style={styles.button}
          disabled={actionBusy}
          onPress={() => saveContent.mutate()}
        >
          <Text style={styles.buttonText}>
            {saveContent.isPending ? 'Saving…' : 'Save title & transcript'}
          </Text>
        </Pressable>
      ) : null}
      {saveContent.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(saveContent.error, 'Save failed')}
        </Text>
      ) : null}

      {row.status === 'review_ready' && (
        <>
          <Text style={styles.section}>Task Suggestions</Text>
          {suggestions.isLoading ? (
            <Text style={styles.meta}>Loading suggestions…</Text>
          ) : suggestions.data && suggestions.data.length > 0 ? (
            suggestions.data.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                busy={actionBusy}
                onApprove={(draft) => approve.mutate({ suggestion, draft })}
                onReject={() => reject.mutate(suggestion.id)}
              />
            ))
          ) : (
            <Text style={styles.meta}>No tasks found in this note.</Text>
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
        </>
      )}

      {isRetryableProcessing(row.status) && (
        <Pressable
          style={styles.button}
          disabled={retry.isPending}
          onPress={() => retry.mutate()}
        >
          <Text style={styles.buttonText}>
            {retry.isPending ? 'Retrying…' : 'Retry processing'}
          </Text>
        </Pressable>
      )}
      {retry.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(retry.error, 'Retry failed')}
        </Text>
      ) : null}

      {canArchive ? (
        <Pressable
          style={[styles.button, styles.secondary]}
          disabled={actionBusy}
          onPress={() => archive.mutate()}
        >
          <Text style={styles.buttonText}>Archive note</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.button, styles.danger]}
        disabled={removeNote.isPending}
        onPress={() => removeNote.mutate()}
      >
        <Text style={styles.buttonText}>
          {removeNote.isPending ? 'Deleting…' : 'Delete note'}
        </Text>
      </Pressable>
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
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            editable={!busy}
          />
          <Text style={styles.fieldLabel}>Details</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={details}
            onChangeText={setDetails}
            editable={!busy}
            multiline
          />
          <Text style={styles.fieldLabel}>Kind</Text>
          <View style={styles.filters}>
            {KINDS.map((k) => (
              <Pressable
                key={k}
                style={[styles.chip, kind === k && styles.chipActive]}
                disabled={busy}
                onPress={() => setKind(k)}
              >
                <Text
                  style={[
                    styles.chipText,
                    kind === k && styles.chipTextActive,
                  ]}
                >
                  {k}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.filters}>
            {([null, 'low', 'normal', 'high'] as const).map((p) => (
              <Pressable
                key={p ?? 'none'}
                style={[styles.chip, priority === p && styles.chipActive]}
                disabled={busy}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.chipText,
                    priority === p && styles.chipTextActive,
                  ]}
                >
                  {p ?? 'none'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Due (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
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
            <Text style={styles.suggestionDetails}>{suggestion.details}</Text>
          ) : null}
          <Text style={styles.suggestionMeta}>
            Status: {suggestion.status.replaceAll('_', ' ')}
          </Text>
        </>
      )}

      <Text style={styles.suggestionMeta}>
        Kind: {suggestion.kind} • Confidence: {suggestion.confidence}
      </Text>
      <Text style={styles.sourceQuote}>"{suggestion.source_quote}"</Text>

      {pending ? (
        <View style={styles.suggestionActions}>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
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
            <Text style={styles.actionButtonText}>Approve</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.danger]}
            disabled={busy}
            onPress={onReject}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 24, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { color: '#555' },
  section: { marginTop: 12, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#14241c',
    backgroundColor: '#fff',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#7a2e0b' },
  button: {
    marginTop: 8,
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#5a5a5a' },
  danger: { backgroundColor: '#7a2e0b' },
  buttonText: { color: '#fff', fontWeight: '600' },
  suggestionCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipActive: { backgroundColor: '#1f4b3a', borderColor: '#1f4b3a' },
  chipText: { color: '#555', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  suggestionTitle: { fontSize: 16, fontWeight: '600', color: '#14241c' },
  suggestionDetails: { fontSize: 14, color: '#555' },
  suggestionMeta: { fontSize: 12, color: '#777' },
  sourceQuote: {
    marginTop: 8,
    fontStyle: 'italic',
    fontSize: 13,
    color: '#555',
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#1f4b3a',
  },
  suggestionActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: { backgroundColor: '#1f4b3a' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
