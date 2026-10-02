import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/constants';

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

export function extensionForMime(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'm4a';
}

export function mimeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  return 'audio/mp4';
}

export {
  useAudioRecorder,
  useAudioRecorderState,
  MAX_AUDIO_DURATION_SECONDS,
};
