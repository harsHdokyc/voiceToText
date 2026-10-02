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
  'archived',
] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

const ALLOWED: Record<NoteStatus, readonly NoteStatus[]> = {
  draft: ['uploading', 'archived'],
  uploading: ['queued', 'upload_failed'],
  upload_failed: ['uploading', 'archived'],
  queued: ['transcribing', 'archived'],
  transcribing: ['extracting', 'review_ready', 'transcription_failed'],
  transcription_failed: ['queued', 'archived'],
  extracting: ['review_ready', 'extraction_failed'],
  // queued = full reprocess; extracting = re-run extraction only (process-note)
  extraction_failed: ['queued', 'extracting', 'archived'],
  review_ready: ['archived'],
  archived: [],
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

export function noteStatusLabel(status: NoteStatus) {
  return status.replaceAll('_', ' ');
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
