import { supabase } from '@/lib/supabase';
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
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NoteRow[];
}

export async function getNote(noteId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single();
  if (error) throw error;
  return data as NoteRow;
}

export async function createDraftNote() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, status: 'draft' })
    .select('*')
    .single();
  if (error) throw error;
  return data as NoteRow;
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
  if (!data) throw new Error(`Could not move note from ${from} to ${to}`);
  return data as NoteRow;
}

export async function uploadNoteAudio(params: {
  note: NoteRow;
  uri: string;
  mimeType: string;
  durationSeconds: number;
  extension?: string;
}) {
  const durationSeconds = assertAudioDurationSeconds(params.durationSeconds);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  let note = params.note;
  if (note.status === 'draft' || note.status === 'upload_failed') {
    note = await updateNoteStatus(note.id, note.status, 'uploading');
  } else if (note.status !== 'uploading') {
    throw new Error(`Cannot upload from status ${note.status}`);
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
    throw new Error('Could not read recording file');
  }
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('note-audio')
    .upload(audioPath, blob, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (uploadError) {
    await updateNoteStatus(note.id, 'uploading', 'upload_failed', {
      last_error_code: 'storage_upload_failed',
    });
    throw uploadError;
  }

  return updateNoteStatus(note.id, 'uploading', 'queued', {
    audio_path: audioPath,
    audio_mime_type: params.mimeType,
    audio_duration_seconds: durationSeconds,
    last_error_code: null,
    title: note.title ?? `Voice note`,
  });
}

export async function requestTranscription(noteId: string) {
  const { data, error } = await supabase.functions.invoke('process-note', {
    body: { noteId },
  });
  if (error) throw error;
  return data as {
    ok: boolean;
    status?: NoteStatus;
    error?: string;
  };
}

export async function retryTranscription(note: NoteRow) {
  if (note.status !== 'transcription_failed' && note.status !== 'queued') {
    throw new Error('Note is not retryable for transcription');
  }
  let current = note;
  if (note.status === 'transcription_failed') {
    current = await updateNoteStatus(note.id, 'transcription_failed', 'queued', {
      last_error_code: null,
    });
  }
  return requestTranscription(current.id);
}
