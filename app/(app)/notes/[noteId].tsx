import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
  getNote,
  retryTranscription,
} from '@/features/notes/services/notes-service';
import { isRetryableProcessing } from '@/features/notes/services/note-status';
import {
  approveSuggestion,
  buildSuggestionEdits,
  getSuggestions,
  isPendingSuggestion,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { errorMessageForUi } from '@/lib/api-error';

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

  const suggestions = useQuery({
    queryKey: ['suggestions', noteId],
    queryFn: () => getSuggestions(noteId),
    enabled: Boolean(noteId) && note.data?.status === 'review_ready',
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
      draft: { title: string; details: string };
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
          {note.error instanceof Error ? note.error.message : 'Note not found'}
        </Text>
      </View>
    );
  }

  const row = note.data;
  const actionBusy = approve.isPending || reject.isPending;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{row.title ?? 'Voice note'}</Text>
      <Text style={styles.meta}>Status: {row.status.replaceAll('_', ' ')}</Text>
      {row.last_error_code ? (
        <Text style={styles.error}>Error: {row.last_error_code}</Text>
      ) : null}

      <Text style={styles.section}>Transcript</Text>
      {row.status === 'queued' ||
      row.status === 'transcribing' ||
      row.status === 'extracting' ? (
        <Text style={styles.meta}>
          {row.status === 'extracting' ? 'Extracting tasks…' : 'Transcribing…'}
        </Text>
      ) : row.transcript ? (
        <Text style={styles.transcript}>{row.transcript}</Text>
      ) : (
        <Text style={styles.meta}>No transcript yet.</Text>
      )}

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
                onApprove={(draft) =>
                  approve.mutate({ suggestion, draft })
                }
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
          {retry.error instanceof Error ? retry.error.message : 'Retry failed'}
        </Text>
      ) : null}

      <Pressable
        style={[styles.button, styles.rejectButton]}
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
    </ScrollView>
  );
}

function SuggestionCard(props: {
  suggestion: TaskSuggestion;
  busy: boolean;
  onApprove: (draft: { title: string; details: string }) => void;
  onReject: () => void;
}) {
  const { suggestion, busy, onApprove, onReject } = props;
  const pending = isPendingSuggestion(suggestion.status);
  const [title, setTitle] = useState(suggestion.title);
  const [details, setDetails] = useState(suggestion.details ?? '');

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
      {suggestion.due_at ? (
        <Text style={styles.suggestionMeta}>
          Due: {new Date(suggestion.due_at).toLocaleDateString()}
        </Text>
      ) : null}
      {suggestion.priority ? (
        <Text style={styles.suggestionMeta}>
          Priority: {suggestion.priority}
        </Text>
      ) : null}
      <Text style={styles.sourceQuote}>"{suggestion.source_quote}"</Text>

      {pending ? (
        <View style={styles.suggestionActions}>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            disabled={busy}
            onPress={() => onApprove({ title, details })}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
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
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: '#f7f7f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#555' },
  section: { marginTop: 12, fontWeight: '600' },
  transcript: { fontSize: 16, lineHeight: 22, color: '#14241c' },
  error: { color: '#7a2e0b' },
  button: {
    marginTop: 12,
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
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
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#14241c',
    backgroundColor: '#fafafa',
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
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
  suggestionActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveButton: { backgroundColor: '#1f4b3a' },
  rejectButton: { backgroundColor: '#7a2e0b' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
