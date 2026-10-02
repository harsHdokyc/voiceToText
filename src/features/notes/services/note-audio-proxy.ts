import { getPublicEnv } from '@/lib/env';
import { ApiError } from '@/lib/api-error';
import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new ApiError('not_signed_in', 'Not signed in');
  return token;
}

function noteAudioUrl(action: 'upload' | 'download') {
  const { EXPO_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/note-audio?action=${action}`;
}

export type NoteAudioUploadResult = {
  ok: true;
  note: {
    id: string;
    title: string | null;
    audio_mime_type: string | null;
    audio_duration_seconds: number | null;
    transcript: string | null;
    edited_transcript: string | null;
    language: string | null;
    status: string;
    processing_attempts: number;
    last_error_code: string | null;
    created_at: string;
    updated_at: string;
  };
};

/** Upload via Edge proxy — client never sends or receives storage keys. */
export async function proxyUploadNoteAudio(params: {
  noteId: string;
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  filename: string;
}) {
  return withApiLog(
    'api.notes.audio_upload_proxy',
    {
      noteId: params.noteId,
      mimeType: params.mimeType,
      durationSeconds: params.durationSeconds,
      bytes: params.blob.size,
    },
    async () => {
      const token = await accessToken();
      const form = new FormData();
      form.append('noteId', params.noteId);
      form.append('durationSeconds', String(params.durationSeconds));
      form.append('mimeType', params.mimeType);
      form.append('file', params.blob, params.filename);

      const response = await fetch(noteAudioUrl('upload'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: getPublicEnv().EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        },
        body: form,
      });

      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        reason?: string;
        note?: NoteAudioUploadResult['note'];
      } | null;

      if (!response.ok || !body?.ok || !body.note) {
        throw new ApiError(
          body?.error ?? `http_${response.status}`,
          body?.reason ?? body?.error ?? `Audio upload proxy failed (${response.status})`,
        );
      }

      return body.note;
    },
  );
}

/** Download via Edge proxy — returns audio bytes; storage key never leaves the server. */
export async function proxyDownloadNoteAudio(noteId: string) {
  return withApiLog('api.notes.audio_download_proxy', { noteId }, async () => {
    const token = await accessToken();
    const response = await fetch(noteAudioUrl('download'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getPublicEnv().EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'download', noteId }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        reason?: string;
      } | null;
      throw new ApiError(
        body?.error ?? `http_${response.status}`,
        body?.reason ?? body?.error ?? `Audio download proxy failed (${response.status})`,
      );
    }

    const mimeType = response.headers.get('Content-Type') ?? 'audio/mp4';
    const blob = await response.blob();
    return { blob, mimeType, bytes: blob.size };
  });
}
