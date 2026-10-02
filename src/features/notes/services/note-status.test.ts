import { describe, expect, it } from 'vitest';

import {
  assertAudioDurationSeconds,
  assertNoteStatusTransition,
  buildNoteAudioPath,
  canTransitionNoteStatus,
  isClaimableForTranscription,
  noteStatusLabel,
} from './note-status';

describe('canTransitionNoteStatus', () => {
  it('allows draft to uploading', () => {
    expect(canTransitionNoteStatus('draft', 'uploading')).toBe(true);
  });

  it('rejects draft to review_ready', () => {
    expect(canTransitionNoteStatus('draft', 'review_ready')).toBe(false);
  });

  it('allows queued to transcribing', () => {
    expect(canTransitionNoteStatus('queued', 'transcribing')).toBe(true);
  });

  it('allows transcribing to review_ready for Phase 3 skip-extract path', () => {
    expect(canTransitionNoteStatus('transcribing', 'review_ready')).toBe(true);
  });
});

describe('assertNoteStatusTransition', () => {
  it('throws a clear error for illegal transitions', () => {
    expect(() => assertNoteStatusTransition('archived', 'draft')).toThrow(
      /Invalid note status transition: archived -> draft/,
    );
  });
});

describe('isClaimableForTranscription', () => {
  it('claims queued and transcription_failed only', () => {
    expect(isClaimableForTranscription('queued')).toBe(true);
    expect(isClaimableForTranscription('transcription_failed')).toBe(true);
    expect(isClaimableForTranscription('review_ready')).toBe(false);
  });
});

describe('noteStatusLabel', () => {
  it('replaces underscores for display', () => {
    expect(noteStatusLabel('transcription_failed')).toBe('transcription failed');
    expect(noteStatusLabel('queued')).toBe('queued');
  });
});

describe('assertAudioDurationSeconds', () => {
  it('accepts a short clip', () => {
    expect(assertAudioDurationSeconds(12)).toBe(12);
  });

  it('rejects zero and over-cap durations', () => {
    expect(() => assertAudioDurationSeconds(0)).toThrow(/invalid/i);
    expect(() => assertAudioDurationSeconds(61)).toThrow(/60 seconds or less/);
  });
});

describe('buildNoteAudioPath', () => {
  it('builds the ownership path pattern', () => {
    expect(
      buildNoteAudioPath({
        userId: 'user-1',
        noteId: 'note-2',
        extension: 'm4a',
      }),
    ).toBe('user-1/notes/note-2/original.m4a');
  });

  it('strips a leading dot and defaults extension to m4a', () => {
    expect(
      buildNoteAudioPath({
        userId: 'u',
        noteId: 'n',
        extension: '.webm',
      }),
    ).toBe('u/notes/n/original.webm');
    expect(buildNoteAudioPath({ userId: 'u', noteId: 'n' })).toBe(
      'u/notes/n/original.m4a',
    );
  });
});
