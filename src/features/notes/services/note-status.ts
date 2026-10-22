import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/constants';

export const NOTE_STATUSES = [
  'draft',
  'uploading',
  'queued',
  'transcribing',
  'extracting',
  'review_ready',
  'upload_failed',
  'transcription_failed',
  'extraction_failed',
] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

const ALLOWED: Record<NoteStatus, readonly NoteStatus[]> = {
  draft: ['uploading'],
  uploading: ['queued', 'upload_failed'],
  upload_failed: ['uploading'],
  queued: ['transcribing'],
  transcribing: ['extracting', 'review_ready', 'transcription_failed'],
  transcription_failed: ['queued'],
  extracting: ['review_ready', 'extraction_failed'],
  // queued = full reprocess; extracting = re-run extraction only (process-note)
  extraction_failed: ['queued', 'extracting'],
  review_ready: [],
};

export function canTransitionNoteStatus(from: NoteStatus, to: NoteStatus) {
  return ALLOWED[from].includes(to);
}

export function assertNoteStatusTransition(from: NoteStatus, to: NoteStatus) {
  if (!canTransitionNoteStatus(from, to)) {
    throw new Error(`Invalid note status transition: ${from} -> ${to}`);
  }
}

/** Statuses that may be claimed by process-note for transcription. */
export function isClaimableForTranscription(status: NoteStatus) {
  return status === 'queued' || status === 'transcription_failed';
}

/** Statuses that may be claimed by process-note for extraction-only retry. */
export function isClaimableForExtraction(status: NoteStatus) {
  return status === 'extraction_failed' || status === 'extracting';
}

/** Client retry button — failed or still-queued notes. */
export function isRetryableProcessing(status: NoteStatus) {
  return (
    status === 'queued' ||
    status === 'transcription_failed' ||
    status === 'extraction_failed'
  );
}

/** Shown in place of the note waveform after retention removes the file. */
export const AUDIO_DELETED_LABEL = 'Audio deleted after 3 days';

/** Shown when the file is gone and there is nothing to re-extract. */
export const AUDIO_RETRY_UNAVAILABLE_LABEL =
  'Audio deleted after 3 days. There’s no transcript to retry from.';

export function isNoteAudioPurged(note: { audio_purged_at?: string | null }) {
  return Boolean(note.audio_purged_at?.trim());
}

/** Audio exists once upload persisted its MIME type, until retention purges it. */
export function canPlayNoteAudio(note: {
  audio_mime_type: string | null;
  audio_purged_at?: string | null;
}) {
  return Boolean(note.audio_mime_type?.trim()) && !isNoteAudioPurged(note);
}

export type RetryProcessingPlan = 'extract' | 'transcribe' | 'audio_gone';

type RetryNote = {
  status: NoteStatus;
  transcript: string | null;
  audio_purged_at?: string | null;
};

/**
 * A stored transcript retries through extract-note and does not need the file.
 * After purge, that includes transcription failures and stuck extracting notes.
 * Purge with no transcript cannot call process-note.
 */
export function retryProcessingPlan(note: RetryNote): RetryProcessingPlan {
  const transcript = Boolean(note.transcript?.trim());
  const purged = isNoteAudioPurged(note);
  if (transcript && (note.status === 'extraction_failed' || purged)) {
    return 'extract';
  }
  if (purged) return 'audio_gone';
  return 'transcribe';
}

/** Retry control. Hidden once the file and the transcript are both gone. */
export function showProcessingRetry(note: RetryNote): boolean {
  const plan = retryProcessingPlan(note);
  if (plan === 'audio_gone') return false;
  if (isRetryableProcessing(note.status)) return true;
  return plan === 'extract' && note.status === 'extracting';
}

export function audioRetryUnavailableLabel(note: RetryNote): string | null {
  if (retryProcessingPlan(note) !== 'audio_gone') return null;
  return AUDIO_RETRY_UNAVAILABLE_LABEL;
}

export function noteStatusLabel(status: NoteStatus) {
  return status.replaceAll('_', ' ');
}

/** Short card-stat label — fits a tight 3-up column. */
export function noteStatusShort(status: NoteStatus) {
  if (status === 'review_ready') return 'Ready';
  if (
    status === 'upload_failed' ||
    status === 'transcription_failed' ||
    status === 'extraction_failed'
  ) {
    return 'Fail';
  }
  if (
    status === 'uploading' ||
    status === 'queued' ||
    status === 'transcribing' ||
    status === 'extracting'
  ) {
    return 'Live';
  }
  return 'Draft';
}

/** Prefer user-edited transcript when present. */
export function displayTranscript(note: {
  transcript: string | null;
  edited_transcript: string | null;
}) {
  const edited = note.edited_transcript?.trim();
  if (edited) return edited;
  return note.transcript?.trim() || null;
}

export function normalizeNoteSearchQuery(query: string): string | undefined {
  const trimmed = query
    .trim()
    .replaceAll('%', '')
    .replaceAll('_', '')
    .replace(/[(),.*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function noteMatchesSearch(
  note: {
    title: string | null;
    transcript: string | null;
    edited_transcript: string | null;
  },
  query: string,
): boolean {
  const needle = normalizeNoteSearchQuery(query)?.toLowerCase();
  if (!needle) return true;
  const hay = `${note.title ?? ''}\n${displayTranscript(note) ?? ''}`.toLowerCase();
  return hay.includes(needle);
}

export function assertAudioDurationSeconds(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Recording duration is invalid');
  }
  if (durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
    throw new Error(
      `Recording must be ${MAX_AUDIO_DURATION_SECONDS} seconds or less`,
    );
  }
  return durationSeconds;
}

export function buildNoteAudioPath(params: {
  userId: string;
  noteId: string;
  extension?: string;
}) {
  const ext = (params.extension ?? 'm4a').replace(/^\./, '');
  // First segment = auth.uid() for Storage RLS. Never expose to client API.
  return `${params.userId}/notes/${params.noteId}/original.${ext}`;
}
