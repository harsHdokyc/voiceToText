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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Prototype DialogContent: w-[calc(100%-2rem)] max-w-lg max-h-[90dvh]
  const phone = width < 640;
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
  // Prototype Workspace.tsx: disabled={!draft.trim() || thinking}
  const hasDraft = draftThought.trim().length > 0;
  const canProcess = hasDraft && !busy;
  // Prototype: disabled={!draft.trim() || recording || thinking}
  const canJustSave = hasDraft && !isRecording && !busy;
  const maxCardH = Math.min(
    height * 0.9,
    height - insets.top - insets.bottom - (phone ? 16 : 32),
  );

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

  async function stopListening(): Promise<{
    uri: string;
    durationSeconds: number;
  } | null> {
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
        return null;
      }
      setReadyUri(uri);
      setReadyDuration(secs);
      return { uri, durationSeconds: secs };
    } catch (e) {
      setError(errorMessageForUi(e, 'Could not stop recording'));
      return null;
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

  async function resolveClip(): Promise<{
    uri: string;
    durationSeconds: number;
  } | null> {
    if (isRecording) return stopListening();
    if (readyUri) {
      return { uri: readyUri, durationSeconds: readyDuration };
    }
    return null;
  }

  /** Prototype “Turn into next steps” — stop listening, then upload + process. */
  async function turnIntoNextSteps() {
    if (!hasDraft || busy) return;
    setBusy(true);
    setError(null);
    try {
      const clip = await resolveClip();
      if (!clip) {
        setError('Speak a voice note first');
        return;
      }
      const mimeType = mimeFromUri(clip.uri);
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
        uri: clip.uri,
        mimeType,
        durationSeconds: clip.durationSeconds,
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

  /** Prototype “Just save note” — audio when present, else text-only draft. */
  async function justSaveNote() {
    if (!hasDraft || busy || isRecording) return;
    setBusy(true);
    setError(null);
    try {
      const note = await createDraftNote();
      const title = draftTitle.trim();
      const thought = draftThought.trim();
      if (title || thought) {
        await updateNoteContent(note.id, {
          ...(title ? { title } : {}),
          ...(thought ? { edited_transcript: thought } : {}),
        });
      }
      if (readyUri) {
        const mimeType = mimeFromUri(readyUri);
        await uploadNoteAudio({
          note,
          uri: readyUri,
          mimeType,
          durationSeconds: readyDuration,
          extension: extensionForMime(mimeType),
        });
      }
      onClose();
      router.push({
        pathname: '/(app)/notes/[noteId]',
        params: { noteId: note.id },
      });
    } catch (e) {
      setError(errorMessageForUi(e, 'Save failed'));
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
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, phone ? 8 : 16),
            paddingBottom: Math.max(insets.bottom, phone ? 8 : 16),
            paddingHorizontal: phone ? 16 : space[4],
          },
        ]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Close capture"
        />
        <View
          style={[styles.card, { maxHeight: maxCardH }]}
          accessibilityViewIsModal
        >
          {/* Prototype DialogContent: max-h-[90dvh] overflow-y-auto — fine on phone */}
          <ScrollView
            {...({ className: 'saydo-scroll' } as object)}
            style={styles.cardScroll}
            contentContainerStyle={[styles.inner, phone && styles.innerPhone]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Pressable
              onPress={handleClose}
              disabled={busy}
              accessibilityLabel="Close"
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>

            <Text style={[styles.title, phone && styles.titlePhone]}>
              Catch that thought.
            </Text>
            <Text style={styles.desc}>
              Speak or type it messy. Saydo’s AI turns it into next steps you
              review.
            </Text>

            <View style={styles.ribbon}>
              <VoiceRibbon
                live={isRecording}
                color={colors.cobalt}
                compact={phone}
              />
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
                <Text style={styles.timerHint}>
                  {' '}
                  · {MAX_AUDIO_DURATION_SECONDS}s
                  {hasClip ? ' · ready' : ''}
                </Text>
              </Text>
            </View>

            <Text style={[styles.fieldLabel, phone && styles.fieldLabelPhone]}>
              Note title <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextField
              placeholder="A new thought"
              value={draftTitle}
              onChangeText={setDraftTitle}
              editable={!busy}
            />

            <Text style={[styles.fieldLabel, phone && styles.fieldLabelPhone]}>
              Your thought
            </Text>
            <TextField
              className="saydo-scroll"
              style={[styles.thought, phone && styles.thoughtPhone]}
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

            {/* Prototype: grid gap-2 sm:grid-cols-2 — cta xl + quiet xl */}
            <View style={[styles.actions, !phone && styles.actionsDesktop]}>
              <Button
                variant="cta"
                size="xl"
                disabled={!canProcess}
                onPress={() => void turnIntoNextSteps()}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={busy ? 'hourglass-outline' : 'sparkles'}
                  size={16}
                  color={colors.card}
                />
                <Text style={styles.ctaLabel}>
                  {busy ? 'Thinking…' : 'Turn into next steps'}
                </Text>
              </Button>
              <Button
                variant="quiet"
                size="xl"
                disabled={!canJustSave}
                onPress={() => void justSaveNote()}
                style={styles.actionBtn}
              >
                Just save note
              </Button>
            </View>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 23, 23, 0.45)',
  },
  // Prototype: max-w-lg, w-[calc(100%-2rem)], max-h-[90dvh], rounded-lg, p-6
  card: {
    width: '100%',
    maxWidth: 512,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    zIndex: 1,
  },
  cardScroll: {
    flexGrow: 0,
  },
  inner: {
    position: 'relative',
    padding: space[6],
    paddingTop: space[8],
    gap: space[3],
    paddingBottom: space[6],
  },
  innerPhone: {
    padding: space[5],
    paddingTop: 28,
    paddingBottom: space[5],
    gap: space[2],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    paddingRight: space[6],
  },
  titlePhone: {
    fontSize: 26,
    lineHeight: 32,
  },
  // Prototype Dialog close: absolute right-4 top-4
  closeBtn: {
    position: 'absolute',
    top: space[4],
    right: space[4],
    zIndex: 2,
    padding: 4,
    opacity: 0.7,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.stone,
  },
  ribbon: { marginVertical: 0 },
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
  timerHint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.stone,
  },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    marginTop: space[1],
  },
  fieldLabelPhone: {
    marginTop: 0,
    fontSize: 13,
  },
  optional: { color: colors.stone },
  // Fixed box — overflow scrolls inside the field only (not the modal).
  thought: {
    height: 112,
    maxHeight: 112,
    paddingVertical: space[3],
  },
  thoughtPhone: {
    height: 88,
    maxHeight: 88,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  // Prototype: grid gap-2; 1 col mobile, 2 cols from sm
  actions: {
    marginTop: space[1],
    flexDirection: 'column',
    gap: space[2],
    width: '100%',
  },
  actionsDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionBtn: {
    width: '100%',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  ctaLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
});
