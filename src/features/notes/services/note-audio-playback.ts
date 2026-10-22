import { proxyDownloadNoteAudio } from '@/features/notes/services/note-audio-proxy';

/** Web: proxied bytes → in-memory object URL. Call `releaseNoteAudioUri` when done. */
export async function loadNoteAudioUri(noteId: string, _mimeType: string | null) {
  const { blob } = await proxyDownloadNoteAudio(noteId);
  return URL.createObjectURL(blob);
}

export function releaseNoteAudioUri(uri: string) {
  URL.revokeObjectURL(uri);
}
