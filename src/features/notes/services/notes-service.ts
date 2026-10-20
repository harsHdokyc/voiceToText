import { proxyUploadNoteAudio } from '@/features/notes/services/note-audio-proxy';
import {
  DEFAULT_NOTE_CATEGORY,
  normalizeNoteCategory,
  noteMatchesCategoryFilter,
  type NoteCategory,
  type NoteCategoryFilter,
} from '@/features/notes/services/note-category';
import {
  assertAudioDurationSeconds,
  assertNoteStatusTransition,
  canTransitionNoteStatus,
  isRetryableProcessing,
  normalizeNoteSearchQuery,
  noteMatchesSearch,
  type NoteStatus,
} from '@/features/notes/services/note-status';
import { ApiError } from '@/lib/api-error';
import { trackProductEvent } from '@/lib/product-analytics';
import { supabase } from '@/lib/supabase';
import { withApiLog } from '@/lib/with-api-log';

/** Client-facing note — never includes `audio_path` / storage keys. */
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
  created_at: string;
  updated_at: string;
};

const NOTE_PUBLIC_SELECT =
  'id, title, category, audio_mime_type, audio_duration_seconds, transcript, edited_transcript, language, status, processing_attempts, last_error_code, created_at, updated_at';

function asNoteRow(row: NoteRow): NoteRow {
  return { ...row, category: normalizeNoteCategory(row.category) };
}

export type ListNotesParams = {
  query?: string;
  category?: NoteCategoryFilter;
  /** When false, include archived. Default hides archived. */
  includeArchived?: boolean;
};

export async function listNotes(params: ListNotesParams = {}) {
  const search = params.query
    ? normalizeNoteSearchQuery(params.query)
    : undefined;

  return withApiLog(
    'api.notes.list',
    {
      hasQuery: !!search,
      category: params.category ?? 'All notes',
      includeArchived: !!params.includeArchived,
    },
    async () => {
      let q = supabase
        .from('notes')
        .select(NOTE_PUBLIC_SELECT)
        .order('created_at', { ascending: false });

      if (!params.includeArchived) {
        q = q.neq('status', 'archived');
      }

      const { data, error } = await q;
      if (error) throw error;
      let rows = ((data ?? []) as NoteRow[]).map(asNoteRow);
      if (params.category && params.category !== 'All notes') {
        rows = rows.filter((row) =>
          noteMatchesCategoryFilter(row, params.category!),
        );
      }
      if (!search) return rows;
      return rows.filter((row) => noteMatchesSearch(row, search));
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
export async function requestTranscription(noteId: string) {
  return withApiLog('api.notes.process', { noteId }, async () => {
    // Step 1: Transcribe
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

    // Step 2: Extract after transcription-only process-note (`extracting` + flag).
    if (body.extractionSkipped && body.status === 'extracting') {
      try {
        const extractResult = await supabase.functions.invoke('extract-note', {
          body: { noteId },
        });

        const extractBody = (extractResult.data ?? null) as ExtractNoteResponse | null;

        if (extractResult.error || !extractBody?.ok) {
          console.warn('[extract-note] failed but transcription ok', {
            noteId,
            error: extractBody?.error,
          });
          trackProductEvent('extraction_succeeded', { noteId });
          return body;
        }

        trackProductEvent('extraction_succeeded', { noteId });
        return { ...body, ...extractBody };
      } catch {
        console.warn('[extract-note] failed but transcription ok', { noteId });
        trackProductEvent('extraction_succeeded', { noteId });
        return body;
      }
    }

    if (body.status === 'review_ready') {
      trackProductEvent('extraction_succeeded', { noteId });
    }

    return body;
  });
}

export async function updateNoteContent(
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

export async function archiveNote(note: NoteRow) {
  return withApiLog('api.notes.archive', { noteId: note.id }, async () => {
    if (!canTransitionNoteStatus(note.status, 'archived')) {
      throw new ApiError(
        'invalid_note_status_transition',
        `Cannot archive from ${note.status}`,
      );
    }
    return updateNoteStatus(note.id, note.status, 'archived');
  });
}

export async function retryTranscription(note: NoteRow) {
  return withApiLog(
    'api.notes.retry_transcription',
    { noteId: note.id, fromStatus: note.status },
    async () => {
      if (!isRetryableProcessing(note.status)) {
        throw new ApiError(
          'not_retryable',
          'Note is not retryable for processing',
        );
      }
      let current = note;
      // ponytail: extraction_failed → retry extract-only via extract-note
      if (note.status === 'extraction_failed' && note.transcript) {
        const { data, error } = await supabase.functions.invoke('extract-note', {
          body: { noteId: note.id },
        });
        if (error || !data?.ok) {
          throw new ApiError(
            'extract_retry_failed',
            error?.message || 'extract-note retry failed',
            error,
          );
        }
        return data;
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
