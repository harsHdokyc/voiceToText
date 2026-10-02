import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  ensureRecordingPermission,
  extensionForMime,
  mimeFromUri,
  NOTE_RECORDING_PRESET,
  useAudioRecorder,
  useAudioRecorderState,
  MAX_AUDIO_DURATION_SECONDS,
} from '@/features/recording/services/recording';
import {
  createDraftNote,
  requestTranscription,
  uploadNoteAudio,
} from '@/features/notes/services/notes-service';

export default function RecordScreen() {
  const recorder = useAudioRecorder(NOTE_RECORDING_PRESET);
  const state = useAudioRecorderState(recorder, 200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStopped = useRef(false);

  const durationSeconds = Math.floor((state.durationMillis ?? 0) / 1000);

  useEffect(() => {
    if (
      state.isRecording &&
      durationSeconds >= MAX_AUDIO_DURATION_SECONDS &&
      !autoStopped.current
    ) {
      autoStopped.current = true;
      void stopAndUpload();
    }
  }, [durationSeconds, state.isRecording]);

  async function start() {
    setError(null);
    autoStopped.current = false;
    try {
      await ensureRecordingPermission();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recording');
    }
  }

  async function stopAndUpload() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording file produced');

      const duration = Math.max(
        1,
        Math.round((state.durationMillis ?? 0) / 1000),
      );
      const mimeType = mimeFromUri(uri);
      const note = await createDraftNote();
      const queued = await uploadNoteAudio({
        note,
        uri,
        mimeType,
        durationSeconds: duration,
        extension: extensionForMime(mimeType),
      });
      await requestTranscription(queued.id);
      router.replace(`/(app)/notes/${queued.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record</Text>
      <Text style={styles.meta}>
        Max {MAX_AUDIO_DURATION_SECONDS}s · {durationSeconds}s
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!state.isRecording ? (
        <Pressable
          style={styles.button}
          disabled={busy}
          onPress={() => void start()}
        >
          <Text style={styles.buttonText}>Start recording</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, styles.stop]}
          disabled={busy}
          onPress={() => void stopAndUpload()}
        >
          <Text style={styles.buttonText}>
            {busy ? 'Uploading…' : 'Stop & transcribe'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: '#f7f7f5',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { color: '#555' },
  error: { color: '#7a2e0b' },
  button: {
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stop: { backgroundColor: '#7a2e0b' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
