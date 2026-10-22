import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, VoiceRibbon } from '@/components/ui';
import {
  loadNoteAudioUri,
  releaseNoteAudioUri,
} from '@/features/notes/services/note-audio-playback';
import { formatCaptureTimer } from '@/features/recording/services/capture-timer';
import { errorMessageForUi } from '@/lib/api-error';
import { colors } from '@/theme';

/** Loads the private recording on first tap, then plays/pauses in place. */
export function NoteAudioPlayer({
  noteId,
  mimeType,
  durationSeconds,
}: {
  noteId: string;
  mimeType: string | null;
  durationSeconds: number | null;
}) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const load = useMutation({
    mutationFn: () => loadNoteAudioUri(noteId, mimeType),
    onSuccess: (uri) => {
      player.replace(uri);
      player.play();
    },
  });

  const uri = load.data;
  useEffect(() => {
    if (!uri) return;
    return () => releaseNoteAudioUri(uri);
  }, [uri]);

  const duration = status.duration || durationSeconds || 0;
  const atEnd = duration > 0 && status.currentTime >= duration - 0.1;

  const toggle = async () => {
    if (!uri) return load.mutate();
    if (status.playing) return player.pause();
    if (atEnd) await player.seekTo(0);
    player.play();
  };

  return (
    <View>
      <VoiceRibbon live={status.playing} />
      <View className="mt-3 flex-row items-center gap-3">
        <Button
          size="icon"
          className="h-11 w-11 rounded-pill"
          disabled={load.isPending}
          onPress={toggle}
          accessibilityLabel={status.playing ? 'Pause recording' : 'Play recording'}
        >
          {load.isPending ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Ionicons
              name={status.playing ? 'pause' : 'play'}
              size={18}
              color={colors.card}
            />
          )}
        </Button>
        <Text className="font-mono text-xs text-stone">
          {formatCaptureTimer(uri ? status.currentTime : 0)} /{' '}
          {formatCaptureTimer(duration)}
        </Text>
      </View>
      {load.error ? (
        <Text className="mt-2 font-sans text-sm text-destructive">
          {errorMessageForUi(load.error, 'Could not load recording')}
        </Text>
      ) : null}
    </View>
  );
}
