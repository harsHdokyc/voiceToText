import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

import { pickWebRecordingMime } from '@/features/recording/services/recording-format';

const webRecordingMime =
  typeof MediaRecorder === 'undefined'
    ? undefined
    : pickWebRecordingMime((mime) => MediaRecorder.isTypeSupported(mime));

export const NOTE_RECORDING_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  // Keep recordings out of purgeable cache when supported.
  directory: 'document' as const,
  // Prefer MP4 so browser notes also play on iPhone (expo-audio's default WebM doesn't).
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    mimeType: webRecordingMime ?? RecordingPresets.HIGH_QUALITY.web.mimeType,
  },
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