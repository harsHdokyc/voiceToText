/**
 * Server-side object key for private note audio.
 * First path segment MUST be auth.uid() for Storage RLS.
 * Never return this path to the client — use noteId via note-audio proxy.
 */
export function buildNoteAudioPath(params: {
  userId: string;
  noteId: string;
  extension?: string;
}) {
  const ext = (params.extension ?? "m4a").replace(/^\./, "");
  return `${params.userId}/notes/${params.noteId}/original.${ext}`;
}
