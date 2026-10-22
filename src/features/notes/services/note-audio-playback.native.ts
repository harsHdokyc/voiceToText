import { setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import {
  noteAudioAuthHeaders,
  noteAudioDownloadUrl,
} from '@/features/notes/services/note-audio-proxy';
import { extensionForMime } from '@/features/recording/services/recording-format';
import { withApiLog } from '@/lib/with-api-log';

/**
 * Native: download to a cache file (AVPlayer needs byte ranges to stream, the proxy
 * doesn't serve them). Call `releaseNoteAudioUri` when done so audio doesn't outlive retention.
 */
export async function loadNoteAudioUri(noteId: string, mimeType: string | null) {
  return withApiLog('api.notes.audio_playback_download', { noteId }, async () => {
    // Recording leaves iOS routed to the earpiece; switch back to the speaker.
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const target = new File(
      Paths.cache,
      `note-audio-${noteId}.${extensionForMime(mimeType ?? '')}`,
    );
    const file = await File.downloadFileAsync(noteAudioDownloadUrl(noteId), target, {
      headers: await noteAudioAuthHeaders(),
      idempotent: true,
    });
    return file.uri;
  });
}

export function releaseNoteAudioUri(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // Already gone — OS may have purged the cache.
  }
}
