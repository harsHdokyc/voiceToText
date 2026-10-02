import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getNote,
  retryTranscription,
} from '@/features/notes/services/notes-service';

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
        status === 'uploading'
      ) {
        return 2000;
      }
      return false;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{row.title ?? 'Voice note'}</Text>
      <Text style={styles.meta}>Status: {row.status.replaceAll('_', ' ')}</Text>
      {row.last_error_code ? (
        <Text style={styles.error}>Error: {row.last_error_code}</Text>
      ) : null}

      <Text style={styles.section}>Transcript</Text>
      {row.status === 'queued' || row.status === 'transcribing' ? (
        <Text style={styles.meta}>Transcribing…</Text>
      ) : row.transcript ? (
        <Text style={styles.transcript}>{row.transcript}</Text>
      ) : (
        <Text style={styles.meta}>No transcript yet.</Text>
      )}

      {(row.status === 'transcription_failed' || row.status === 'queued') && (
        <Pressable
          style={styles.button}
          disabled={retry.isPending}
          onPress={() => retry.mutate()}
        >
          <Text style={styles.buttonText}>
            {retry.isPending ? 'Retrying…' : 'Retry transcription'}
          </Text>
        </Pressable>
      )}
      {retry.error ? (
        <Text style={styles.error}>
          {retry.error instanceof Error ? retry.error.message : 'Retry failed'}
        </Text>
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
});
