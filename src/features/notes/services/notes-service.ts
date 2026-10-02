import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import {
  assertAudioDurationSeconds,
  assertNoteStatusTransition,
  type NoteStatus,
} from '@/features/notes/services/note-status';
import { proxyUploadNoteAudio } from '@/features/notes/services/note-audio-proxy';

/** Client-facing note — never includes `audio_path` / storage keys. */
export type NoteRow = {
  id: string;
  user_id?: string;
  title: string | null;
  audio_mime_type: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  edited_transcript: string | null;
  language: string | null;
  status: NoteStatus;
  processing_attempts: number;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

const NOTE_PUBLIC_SELECT =
  'id, title, audio_mime_type, audio_duration_seconds, transcript, edited_transcript, language, status, processing_attempts, last_error_code, created_at, updated_at';

export async function listNotes() {
  return withApiLog('api.notes.list', {}, async () => {
    const { data, error } = await supabase
      .from('notes')
      .select(NOTE_PUBLIC_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as NoteRow[];
  });
}

export async function getNote(noteId: string) {
  return withApiLog('api.notes.get', { noteId }, async () => {
    const { data, error } = await supabase
      .from('notes')
      .select(NOTE_PUBLIC_SELECT)
      .eq('id', noteId)
      .single();
    if (error) throw error;
    return data as NoteRow;
  });
}

export async function createDraftNote() {
  return withApiLog('api.notes.create_draft', {}, async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new ApiError('not_signed_in', 'Not signed in');

    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, status: 'draft' })
      .select(NOTE_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return data as NoteRow;
  });
}

async function updateNoteStatus(
  noteId: string,
  from: NoteStatus,
  to: NoteStatus,
  patch: Record<string, unknown> = {},
) {
  assertNoteStatusTransition(from, to);
  const { data, error } = await supabase
    .from('notes')
    .update({
      ...patch,
      status: to,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('status', from)
    .select(NOTE_PUBLIC_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ApiError(
      'status_transition_lost',
      `Could not move note from ${from} to ${to}`,
    );
  }
  return data as NoteRow;
}

export async function uploadNoteAudio(params: {
  note: NoteRow;
  uri: string;
  mimeType: string;
  durationSeconds: number;
  extension?: string;
}) {
  return withApiLog(
    'api.notes.upload',
    {
      noteId: params.note.id,
      mimeType: params.mimeType,
      durationSeconds: params.durationSeconds,
    },
    async () => {
      const durationSeconds = assertAudioDurationSeconds(params.durationSeconds);

      const response = await fetch(params.uri);
      if (!response.ok) {
        throw new ApiError(
          'audio_fetch_failed',
          `Could not read recording file (HTTP ${response.status})`,
        );
      }
      const blob = await response.blob();
      const ext = params.extension ?? 'm4a';

      const note = await proxyUploadNoteAudio({
        noteId: params.note.id,
        blob,
        mimeType: params.mimeType,
        durationSeconds,
        filename: `original.${ext}`,
      });

      return note as NoteRow;
    },
  );
}

type ProcessNoteResponse = {
  ok: boolean;
  status?: NoteStatus;
  error?: string;
  reason?: string;
  skipped?: boolean;
  provider?: string;
  model?: string;
  textLength?: number;
};

export async function requestTranscription(noteId: string) {
  return withApiLog('api.notes.process', { noteId }, async () => {
    const { data, error } = await supabase.functions.invoke('process-note', {
      body: { noteId },
    });

    const body = (data ?? null) as ProcessNoteResponse | null;

    if (error) {
      const fromBody = body?.error;
      throw new ApiError(
        fromBody ?? 'process_note_failed',
        fromBody
          ? `process-note failed: ${fromBody}`
          : error.message,
        error,
      );
    }

    if (!body) {
      throw new ApiError(
        'process_note_empty',
        'process-note returned an empty body',
      );
    }

    if (body.ok === false) {
      throw new ApiError(
        body.error ?? 'process_note_failed',
        body.reason ??
          (body.error
            ? `process-note failed: ${body.error}`
            : 'process-note returned ok:false'),
      );
    }

    return body;
  });
}

export async function retryTranscription(note: NoteRow) {
  return withApiLog(
    'api.notes.retry_transcription',
    { noteId: note.id, fromStatus: note.status },
    async () => {
      if (note.status !== 'transcription_failed' && note.status !== 'queued') {
        throw new ApiError(
          'not_retryable',
          'Note is not retryable for transcription',
        );
      }
      let current = note;
      if (note.status === 'transcription_failed') {
        current = await updateNoteStatus(
          note.id,
          'transcription_failed',
          'queued',
          { last_error_code: null },
        );
      }
      return requestTranscription(current.id);
    },
  );
}
