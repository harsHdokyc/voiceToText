import { supabase } from '@/lib/supabase';
import { ApiError, describeError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import {
  assertAudioDurationSeconds,
  assertNoteStatusTransition,
  buildNoteAudioPath,
  type NoteStatus,
} from '@/features/notes/services/note-status';

export type NoteRow = {
  id: string;
  user_id: string;
  title: string | null;
  audio_path: string | null;
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

export async function listNotes() {
  return withApiLog('api.notes.list', {}, async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as NoteRow[];
  });
}

export async function getNote(noteId: string) {
  return withApiLog('api.notes.get', { noteId }, async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
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
      .select('*')
      .single();
    if (error) throw error;
    return data as NoteRow;
  });
}

async function updateNoteStatus(
  noteId: string,
  from: NoteStatus,
  to: NoteStatus,
  patch: Partial<NoteRow> = {},
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
    .select('*')
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new ApiError('not_signed_in', 'Not signed in');

      let note = params.note;
      if (note.status === 'draft' || note.status === 'upload_failed') {
        note = await updateNoteStatus(note.id, note.status, 'uploading');
      } else if (note.status !== 'uploading') {
        throw new ApiError(
          'invalid_upload_status',
          `Cannot upload from status ${note.status}`,
        );
      }

      const audioPath = buildNoteAudioPath({
        userId: user.id,
        noteId: note.id,
        extension: params.extension,
      });

      const response = await fetch(params.uri);
      if (!response.ok) {
        await updateNoteStatus(note.id, 'uploading', 'upload_failed', {
          last_error_code: 'audio_fetch_failed',
        });
        throw new ApiError(
          'audio_fetch_failed',
          `Could not read recording file (HTTP ${response.status})`,
        );
      }
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('note-audio')
        .upload(audioPath, blob, {
          contentType: params.mimeType,
          upsert: true,
        });

      if (uploadError) {
        const described = describeError(uploadError);
        await updateNoteStatus(note.id, 'uploading', 'upload_failed', {
          last_error_code: described.code.slice(0, 80),
        });
        throw new ApiError(
          'storage_upload_failed',
          described.reason,
          uploadError,
        );
      }

      return updateNoteStatus(note.id, 'uploading', 'queued', {
        audio_path: audioPath,
        audio_mime_type: params.mimeType,
        audio_duration_seconds: durationSeconds,
        last_error_code: null,
        title: note.title ?? `Voice note`,
      });
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
      const described = describeError(error);
      throw new ApiError(
        fromBody ?? described.code,
        fromBody
          ? `process-note failed: ${fromBody}`
          : described.reason,
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
        body.error
          ? `process-note failed: ${body.error}`
          : 'process-note returned ok:false',
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
