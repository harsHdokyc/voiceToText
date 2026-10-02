import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/constants';

export {
  extensionForMime,
  mimeFromUri,
} from '@/features/recording/services/recording-format';

export const NOTE_RECORDING_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  // Keep recordings out of purgeable cache when supported.
  directory: 'document' as const,
};

export async function ensureRecordingPermission() {
  const status = await requestRecordingPermissionsAsync();
  if (!status.granted) {
    throw new Error('Microphone permission is required to record');
  }
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
}

export {
  useAudioRecorder,
  useAudioRecorderState,
  MAX_AUDIO_DURATION_SECONDS,
};
