import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { proxyDownloadNoteAudio } from '@/features/notes/services/note-audio-proxy';
import {
  extensionForMime,
  isWebmAudio,
} from '@/features/recording/services/recording-format';
import { ApiError } from '@/lib/api-error';

/**
 * Native: proxied bytes → cache file (AVPlayer needs byte ranges to stream, the proxy
 * doesn't serve them). Call `releaseNoteAudioUri` when done so audio doesn't outlive retention.
 */
export async function loadNoteAudioUri(noteId: string, mimeType: string | null) {
  const { bytes } = await proxyDownloadNoteAudio(noteId);
  // Older browser recordings are WebM (stored labelled mp4); AVPlayer fails on them silently.
  if (Platform.OS === 'ios' && isWebmAudio(bytes)) {
    throw new ApiError(
      'audio_format_unsupported',
      'This note was recorded in a browser format iPhone can’t play. Open it on the web to listen.',
    );
  }
  // Recording leaves iOS routed to the earpiece; switch back to the speaker.
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  const file = new File(
    Paths.cache,
    `note-audio-${noteId}.${extensionForMime(mimeType ?? '')}`,
  );
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

export function releaseNoteAudioUri(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // Already gone — OS may have purged the cache.
  }
}
