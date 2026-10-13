import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, TextField, VoiceRibbon } from '@/components/ui';
import { formatCaptureTimer } from '@/features/recording/services/capture-timer';
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
  updateNoteContent,
  uploadNoteAudio,
} from '@/features/notes/services/notes-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, radius, space } from '@/theme';

type CaptureContextValue = {
  openCapture: () => void;
  closeCapture: () => void;
};

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function useCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) {
    throw new Error('useCapture must be used within CaptureProvider');
  }
  return ctx;
}

/** Optional for screens that may render outside the provider (shouldn’t happen in app shell). */
export function useCaptureOptional() {
  return useContext(CaptureContext);
}

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCapture = useCallback(() => setOpen(true), []);
  const closeCapture = useCallback(() => setOpen(false), []);

  return (
    <CaptureContext.Provider value={{ openCapture, closeCapture }}>
      {children}
      <CaptureSheet open={open} onClose={closeCapture} />
    </CaptureContext.Provider>
  );
}

/**
 * In-place Dialog overlay (prototype Workspace capture) — not a separate route.
 * Engine stays expo-audio → upload → process-note.
 */
function CaptureSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const recorder = useAudioRecorder(NOTE_RECORDING_PRESET);
  const state = useAudioRecorderState(recorder, 200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const [readyDuration, setReadyDuration] = useState(0);
  const autoStopped = useRef(false);

  const isRecording = state.isRecording;
  const durationSeconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const displaySeconds = isRecording ? durationSeconds : readyDuration;
  const canSubmit = Boolean(readyUri) && !isRecording && !busy;

  const reset = useCallback(() => {
    setBusy(false);
    setError(null);
    setDraftTitle('');
    setReadyUri(null);
    setReadyDuration(0);
    autoStopped.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      if (state.isRecording) {
        void recorder.stop().catch(() => undefined);
      }
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (
      open &&
      isRecording &&
      durationSeconds >= MAX_AUDIO_DURATION_SECONDS &&
      !autoStopped.current
    ) {
      autoStopped.current = true;
      void stopListening();
    }
  }, [durationSeconds, isRecording, open]);

  async function startListening() {
    setError(null);
    setReadyUri(null);
    setReadyDuration(0);
    autoStopped.current = false;
    try {
      await ensureRecordingPermission();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      setError(errorMessageForUi(e, 'Could not start recording'));
    }
  }

  async function stopListening() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const secs = Math.max(
        1,
        Math.round((state.durationMillis ?? 0) / 1000),
      );
      if (!uri) {
        setError('No recording file produced');
        return;
      }
      setReadyUri(uri);
      setReadyDuration(secs);
    } catch (e) {
      setError(errorMessageForUi(e, 'Could not stop recording'));
    }
  }

  async function toggleSpeak() {
    if (busy) return;
    if (isRecording) {
      await stopListening();
      return;
    }
    await startListening();
  }

  async function turnIntoNextSteps() {
    if (!readyUri || busy || isRecording) return;
    setBusy(true);
    setError(null);
    try {
      const mimeType = mimeFromUri(readyUri);
      const note = await createDraftNote();
      const title = draftTitle.trim();
      if (title) {
        await updateNoteContent(note.id, { title });
      }
      const queued = await uploadNoteAudio({
        note,
        uri: readyUri,
        mimeType,
        durationSeconds: readyDuration,
        extension: extensionForMime(mimeType),
      });
      await requestTranscription(queued.id);
      onClose();
      router.push({
        pathname: '/(app)/notes/[noteId]',
        params: { noteId: queued.id },
      });
    } catch (e) {
      setError(errorMessageForUi(e, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (busy) return;
    if (isRecording) {
      void recorder.stop().catch(() => undefined);
    }
    onClose();
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Close capture"
        />
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView
            contentContainerStyle={styles.inner}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Catch that thought.</Text>
              <Pressable
                onPress={handleClose}
                disabled={busy}
                accessibilityLabel="Close"
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <Text style={styles.desc}>
              Speak or type it messy. Saydo’s AI turns it into next steps you
              review.
            </Text>

            <View style={styles.ribbon}>
              <VoiceRibbon live={isRecording} color={colors.cobalt} />
            </View>

            <View style={styles.speakRow}>
              <Button
                variant={isRecording ? 'destructive' : 'cta'}
                size="xl"
                disabled={busy}
                onPress={() => void toggleSpeak()}
                accessibilityLabel={
                  isRecording ? 'Stop listening' : 'Speak'
                }
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={18}
                  color={colors.card}
                />
                <Text style={styles.speakLabel}>
                  {isRecording ? 'Stop listening' : 'Speak'}
                </Text>
              </Button>
              <Text style={styles.timer} accessibilityLiveRegion="polite">
                {formatCaptureTimer(displaySeconds)}
              </Text>
            </View>

            <Text style={styles.maxHint}>
              Max {MAX_AUDIO_DURATION_SECONDS}s
              {readyUri && !isRecording ? ' · Ready to process' : ''}
            </Text>

            <Text style={styles.fieldLabel}>
              Note title <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextField
              placeholder="A new thought"
              value={draftTitle}
              onChangeText={setDraftTitle}
              editable={!busy}
            />

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Button
              variant="cta"
              size="xl"
              disabled={!canSubmit}
              onPress={() => void turnIntoNextSteps()}
              style={styles.primary}
            >
              <Ionicons
                name={busy ? 'hourglass-outline' : 'sparkles'}
                size={18}
                color={colors.card}
              />
              <Text style={styles.primaryLabel}>
                {busy ? 'Thinking…' : 'Turn into next steps'}
              </Text>
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[4],
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 23, 23, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    zIndex: 1,
  },
  inner: {
    padding: space[6],
    gap: space[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[3],
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
  },
  closeBtn: {
    padding: 4,
    marginTop: 2,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
    marginBottom: space[1],
  },
  ribbon: { marginVertical: space[1] },
  speakRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  speakLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
  timer: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.ink,
  },
  maxHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.stone,
    textAlign: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    marginTop: space[2],
  },
  optional: { color: colors.stone },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  primary: { marginTop: space[2] },
  primaryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
});
