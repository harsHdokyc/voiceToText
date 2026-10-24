import { proxyUploadNoteAudio } from '@/features/notes/services/note-audio-proxy';
import {
  DEFAULT_NOTE_CATEGORY,
  normalizeNoteCategory,
  type NoteCategory,
} from '@/features/notes/services/note-category';
import {
  filterListedNotes,
  type ListNotesParams,
} from '@/features/notes/services/filter-listed-notes';
import {
  assertAudioDurationSeconds,
  assertNoteStatusTransition,
  AUDIO_RETRY_UNAVAILABLE_LABEL,
  retryProcessingPlan,
  showProcessingRetry,
  type NoteStatus,
} from '@/features/notes/services/note-status';
import {
  audioMimeForUpload,
  extensionForMime,
  mimeFromUri,
} from '@/features/recording/services/recording-format';
import { deviceTimeZone } from '@/features/settings/services/time-zone';
import { ApiError, describeError } from '@/lib/api-error';
import { invokeEdge } from '@/lib/invoke-edge';
import { logger } from '@/lib/logger';
import { trackProductEvent } from '@/lib/product-analytics';
import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';

/** Client-facing note â€” never includes `audio_path` / storage keys. */
export type NoteRow = {
  id: string;
  user_id?: string;
  title: string | null;
  category: NoteCategory;
  audio_mime_type: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  edited_transcript: string | null;
  language: string | null;
  status: NoteStatus;
  processing_attempts: number;
  last_error_code: string | null;
  /** Set by purge-note-audio. Null means the file was not removed by retention. */
  audio_purged_at: string | null;
  created_at: string;
  updated_at: string;
};

const NOTE_PUBLIC_SELECT =
  'id, title, category, audio_mime_type, audio_duration_seconds, transcript, edited_transcript, language, status, processing_attempts, last_error_code, audio_purged_at, created_at, updated_at';

function asNoteRow(row: NoteRow): NoteRow {
  return {
    ...row,
    category: normalizeNoteCategory(row.category),
    audio_purged_at: row.audio_purged_at ?? null,
  };
}

export type { ListNotesParams };
export { filterListedNotes };

/** Always loads the full note list; pass params only when filtering outside React Query. */
export async function listNotes(params: ListNotesParams = {}) {
  return withApiLog(
    'api.notes.list',
    {
      hasQuery: !!params.query?.trim(),
      category: params.category ?? 'All notes',
    },
    async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(NOTE_PUBLIC_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = ((data ?? []) as NoteRow[]).map(asNoteRow);
      return filterListedNotes(rows, params);
    },
  );
}

export async function getNote(noteId: string) {
  return withApiLog('api.notes.get', { noteId }, async () => {
    const { data, error } = await supabase
      .from('notes')
      .select(NOTE_PUBLIC_SELECT)
      .eq('id', noteId)
      .single();
    if (error) throw error;
    return asNoteRow(data as NoteRow);
  });
}

async function createDraftNote() {
  return withApiLog('api.notes.create_draft', {}, async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new ApiError('not_signed_in', 'Not signed in');

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        status: 'draft',
        category: DEFAULT_NOTE_CATEGORY,
      })
      .select(NOTE_PUBLIC_SELECT)
      .single();
    if (error) throw error;
    return asNoteRow(data as NoteRow);
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
  return asNoteRow(data as NoteRow);
}

async function uploadNoteAudio(params: {
  note: NoteRow;
  uri: string;
  durationSeconds: number;
}) {
  return withApiLog(
    'api.notes.upload',
    {
      noteId: params.note.id,
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
      const mimeType = audioMimeForUpload(blob.type, mimeFromUri(params.uri));

      const note = await proxyUploadNoteAudio({
        noteId: params.note.id,
        blob,
        mimeType,
        durationSeconds,
        filename: `original.${extensionForMime(mimeType)}`,
      });

      return asNoteRow(note as NoteRow);
    },
  );
}

type ProcessNoteResponse = {
  ok: boolean;
  status?: NoteStatus;
  error?: string;
  reason?: string;
  skipped?: boolean;
  transcriptionProvider?: string;
  transcriptionModel?: string;
  extractionProvider?: string;
  extractionModel?: string;
  textLength?: number;
  extractionSkipped?: boolean;
};

type ExtractNoteResponse = {
  ok: boolean;
  status?: NoteStatus;
  error?: string;
  reason?: string;
  skipped?: boolean;
  extractionProvider?: string;
  extractionModel?: string;
  textLength?: number;
  suggestionCount?: number;
};

/**
 * ponytail: Free tier optimization - chain transcription then extraction.
 * process-note does transcription only, extract-note does extraction.
 */
async function requestTranscription(noteId: string) {
  return withApiLog('api.notes.process', { noteId }, async () => {
    const body = await invokeEdge<ProcessNoteResponse>('process-note', 'process_note', { noteId });

    // Step 2: Extract after transcription-only process-note (`extracting` + flag).
    if (body.extractionSkipped && body.status === 'extracting') {
      try {
        const extracted = await invokeEdge<ExtractNoteResponse>('extract-note', 'extract_note', {
          noteId,
          timeZone: deviceTimeZone() ?? undefined,
        });
        trackProductEvent('extraction_succeeded', { noteId });
        return { ...body, ...extracted };
      } catch (e) {
        // Transcript is saved; the note stays `extracting`, where note detail offers retry.
        const { code, reason } = describeError(e);
        logger.warn('api.notes.extract', { event: 'fail', noteId, code, reason });
        trackProductEvent('extraction_failed', { noteId, code });
        return body;
      }
    }

    if (body.status === 'review_ready') {
      trackProductEvent('extraction_succeeded', { noteId });
    }

    return body;
  });
}

async function updateNoteContent(
  noteId: string,
  patch: {
    title?: string;
    edited_transcript?: string | null;
    category?: NoteCategory;
  },
) {
  return withApiLog('api.notes.update_content', { noteId }, async () => {
    const body: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      body.title = t.length > 0 ? t : null;
    }
    if (patch.edited_transcript !== undefined) {
      const t = patch.edited_transcript?.trim() ?? '';
      body.edited_transcript = t.length > 0 ? t : null;
    }
    if (patch.category !== undefined) {
      body.category = normalizeNoteCategory(patch.category);
    }
    const { data, error } = await supabase
      .from('notes')
      .update(body)
      .eq('id', noteId)
      .select(NOTE_PUBLIC_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new ApiError('note_update_lost', 'Note update matched no row');
    }
    return asNoteRow(data as NoteRow);
  });
}

export async function retryTranscription(note: NoteRow) {
  return withApiLog(
    'api.notes.retry_transcription',
    { noteId: note.id, fromStatus: note.status },
    async () => {
      const plan = retryProcessingPlan(note);
      if (!showProcessingRetry(note)) {
        throw new ApiError(
          plan === 'audio_gone' ? 'audio_purged' : 'not_retryable',
          plan === 'audio_gone'
            ? AUDIO_RETRY_UNAVAILABLE_LABEL
            : 'Note is not retryable for processing',
        );
      }
      let current = note;
      if (plan === 'extract') {
        return invokeEdge<ExtractNoteResponse>('extract-note', 'extract_retry', {
          noteId: note.id,
          timeZone: deviceTimeZone() ?? undefined,
        });
      }
      // Transcription failures re-queue for a full pass
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

export async function deleteNote(noteId: string) {
  return withApiLog('api.notes.delete', { noteId }, () =>
    invokeEdge('delete-note', 'note_delete', { noteId }),
  );
}

type CaptureClip = { uri: string; durationSeconds: number };

/** Capture sheet save: draft â†’ title/thought â†’ optional audio â†’ optional processing. */
export async function captureNote(params: {
  title: string;
  thought: string;
  clip: CaptureClip | null;
  process: boolean;
}) {
  const draft = await createDraftNote();
  let note = draft;
  try {
    const title = params.title.trim();
    const thought = params.thought.trim();
    if (title || thought) {
      note = await updateNoteContent(draft.id, {
        ...(title ? { title } : {}),
        ...(thought ? { edited_transcript: thought } : {}),
      });
    }
    if (params.clip) note = await uploadNoteAudio({ note, ...params.clip });
  } catch (e) {
    // Only a half-made draft exists; the sheet keeps the user's input for another try.
    await deleteNote(draft.id).catch(() => undefined);
    throw e;
  }
  // Audio is stored and the note is `queued`, which note detail can retry. Failing here would
  // keep the sheet open, and a second tap would create a duplicate note.
  if (params.process && params.clip) await requestTranscription(note.id).catch(() => undefined);
  return note;
}
