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
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, TextField, VoiceRibbon } from '@/components/ui';
import { formatCaptureTimer } from '@/features/recording/services/capture-timer';
import {
  startLiveDictation,
  type LiveDictationSession,
} from '@/features/recording/services/live-dictation';
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
 * Prototype Dialog: live “Your thought” preview + optional title + dual CTAs.
 * Product engine: expo-audio upload; Web Speech is preview-only when available.
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
  const [draftThought, setDraftThought] = useState('');
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const [readyDuration, setReadyDuration] = useState(0);
  const autoStopped = useRef(false);
  const dictationRef = useRef<LiveDictationSession | null>(null);
  const thoughtRef = useRef('');

  const isRecording = state.isRecording;
  const durationSeconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const displaySeconds = isRecording ? durationSeconds : readyDuration;
  const hasClip = Boolean(readyUri) && !isRecording;
  const canProcess = hasClip && !busy;
  const canJustSave = hasClip && !busy;

  const stopDictation = useCallback(() => {
    dictationRef.current?.stop();
    dictationRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopDictation();
    setBusy(false);
    setError(null);
    setDraftTitle('');
    setDraftThought('');
    thoughtRef.current = '';
    setReadyUri(null);
    setReadyDuration(0);
    autoStopped.current = false;
  }, [stopDictation]);

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
      // Live preview into “Your thought” (web). Audio file remains the product path.
      stopDictation();
      dictationRef.current = startLiveDictation({
        baseText: thoughtRef.current,
        onUpdate: (full) => {
          thoughtRef.current = full;
          setDraftThought(full);
        },
        onError: (msg) => setError(msg),
      });
    } catch (e) {
      stopDictation();
      setError(errorMessageForUi(e, 'Could not start recording'));
    }
  }

  async function stopListening() {
    stopDictation();
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

  async function uploadClip(process: boolean) {
    if (!readyUri || busy || isRecording) return;
    setBusy(true);
    setError(null);
    try {
      const mimeType = mimeFromUri(readyUri);
      const note = await createDraftNote();
      const title = draftTitle.trim();
      const thought = draftThought.trim();
      if (title || thought) {
        await updateNoteContent(note.id, {
          ...(title ? { title } : {}),
          ...(thought ? { edited_transcript: thought } : {}),
        });
      }
      const queued = await uploadNoteAudio({
        note,
        uri: readyUri,
        mimeType,
        durationSeconds: readyDuration,
        extension: extensionForMime(mimeType),
      });
      if (process) {
        await requestTranscription(queued.id);
      }
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
    stopDictation();
    if (isRecording) {
      void recorder.stop().catch(() => undefined);
    }
    onClose();
  }

  function onThoughtChange(text: string) {
    thoughtRef.current = text;
    setDraftThought(text);
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
          <View style={styles.inner}>
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
              {hasClip ? ' · Ready to save' : ''}
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

            <Text style={styles.fieldLabel}>Your thought</Text>
            <TextField
              style={styles.thought}
              placeholder="What’s on your mind?"
              value={draftThought}
              onChangeText={onThoughtChange}
              editable={!busy}
              multiline
              scrollEnabled
              textAlignVertical="top"
            />

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                variant="cta"
                size="xl"
                disabled={!canProcess}
                onPress={() => void uploadClip(true)}
                style={styles.actionBtn}
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
              <Button
                variant="quiet"
                size="xl"
                disabled={!canJustSave || isRecording}
                onPress={() => void uploadClip(false)}
                style={styles.actionBtn}
              >
                Just save note
              </Button>
            </View>
          </View>
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
  // Fixed box (prototype ~4 rows) — overflow scrolls inside the field only.
  thought: {
    height: 112,
    maxHeight: 112,
    paddingVertical: space[3],
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  actions: {
    marginTop: space[2],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  actionBtn: { flexGrow: 1, flexBasis: 160, minWidth: 140 },
  primaryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
});
