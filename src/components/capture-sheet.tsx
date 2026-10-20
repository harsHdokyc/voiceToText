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
import { cn } from '@/lib/cn';
import { colors, space } from '@/theme';

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
        className="flex-1 items-center justify-center"
        style={{
          paddingTop: Math.max(insets.top, phone ? 8 : 16),
          paddingBottom: Math.max(insets.bottom, phone ? 8 : 16),
          paddingHorizontal: phone ? 16 : space[4],
        }}
      >
        <Pressable
          className="absolute inset-0 bg-ink/45"
          onPress={handleClose}
          accessibilityLabel="Close capture"
        />
        <View
          className="z-[1] w-full max-w-lg overflow-hidden rounded-lg bg-card"
          style={{ maxHeight: maxCardH }}
          accessibilityViewIsModal
        >
          {/* Prototype DialogContent: max-h-[90dvh] overflow-y-auto — fine on phone */}
          <ScrollView
            className="saydo-scroll"
            style={{ flexGrow: 0 }}
            contentContainerClassName={cn(
              'relative gap-3',
              phone ? 'gap-2 p-5 pb-5 pt-7' : 'p-6 pb-6 pt-8',
            )}
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
              className="absolute right-4 top-4 z-[2] items-center justify-center rounded-md p-2 opacity-70 transition-all duration-200 hover:bg-lime hover:opacity-100 active:bg-lime/80"
            >
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>

            <Text
              className={cn(
                'pr-6 font-display text-ink',
                phone ? 'text-[26px] leading-8' : 'text-[30px] leading-9',
              )}
            >
              Catch that thought.
            </Text>
            <Text className="font-sans text-sm leading-5 text-stone">
              Speak or type it messy. Saydo’s AI turns it into next steps you
              review.
            </Text>

            <View>
              <VoiceRibbon
                live={isRecording}
                color={colors.cobalt}
                compact={phone}
              />
            </View>

            <View className="flex-row flex-wrap items-center justify-center gap-3">
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
                <Text className="font-sans-medium text-[15px] text-card">
                  {isRecording ? 'Stop listening' : 'Speak'}
                </Text>
              </Button>
              <Text
                className="font-mono text-sm text-ink"
                accessibilityLiveRegion="polite"
              >
                {formatCaptureTimer(displaySeconds)}
                <Text className="font-mono text-[11px] text-stone">
                  {' '}
                  · {MAX_AUDIO_DURATION_SECONDS}s
                  {hasClip ? ' · ready' : ''}
                </Text>
              </Text>
            </View>

            <Text
              className={cn(
                'font-sans text-sm text-ink',
                phone ? 'mt-0 text-[13px]' : 'mt-1',
              )}
            >
              Note title <Text className="text-stone">(optional)</Text>
            </Text>
            <TextField
              placeholder="A new thought"
              value={draftTitle}
              onChangeText={setDraftTitle}
              editable={!busy}
            />

            <Text
              className={cn(
                'font-sans text-sm text-ink',
                phone ? 'mt-0 text-[13px]' : 'mt-1',
              )}
            >
              Your thought
            </Text>
            <TextField
              className={cn(
                'saydo-scroll py-3',
                phone ? 'h-[88px] max-h-[88px]' : 'h-28 max-h-28',
              )}
              placeholder="What’s on your mind?"
              value={draftThought}
              onChangeText={onThoughtChange}
              editable={!busy}
              multiline
              scrollEnabled
              textAlignVertical="top"
            />

            {error ? (
              <Text
                className="font-sans text-sm text-destructive"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            {/* Prototype: grid gap-2 sm:grid-cols-2 — cta xl + quiet xl */}
            <View
              className={cn(
                'mt-1 w-full gap-2',
                !phone && 'flex-row items-stretch',
              )}
            >
              <Button
                variant="cta"
                size="xl"
                disabled={!canProcess}
                onPress={() => void turnIntoNextSteps()}
                className="min-w-0 flex-1 shrink grow basis-0"
              >
                <Ionicons
                  name={busy ? 'hourglass-outline' : 'sparkles'}
                  size={16}
                  color={colors.card}
                />
                <Text className="font-sans-medium text-[15px] text-card">
                  {busy ? 'Thinking…' : 'Turn into next steps'}
                </Text>
              </Button>
              <Button
                variant="quiet"
                size="xl"
                disabled={!canJustSave}
                onPress={() => void justSaveNote()}
                className="min-w-0 flex-1 shrink grow basis-0"
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
