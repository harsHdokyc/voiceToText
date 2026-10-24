import { describe, expect, it } from 'vitest';

import {
    assertAudioDurationSeconds,
    assertNoteStatusTransition,
    canPlayNoteAudio,
    canTransitionNoteStatus,
    displayTranscript,
    AUDIO_DELETED_LABEL,
    AUDIO_RETRY_UNAVAILABLE_LABEL,
    audioRetryUnavailableLabel,
    isNoteAudioPurged,
    isNoteProcessing,
    isQuotaBlocked,
    isRetryableProcessing,
    noteRefetchIntervalMs,
    noteMatchesSearch,
    retryProcessingPlan,
    showProcessingRetry,
    noteStatusLabel,
    noteStatusShort,
} from '@/features/notes/services/note-status';

describe('isNoteProcessing', () => {
  it('is true only while the server is working on the note', () => {
    expect(['uploading', 'queued', 'transcribing', 'extracting'].every((s) => isNoteProcessing(s as never))).toBe(true);
    expect(
      ['draft', 'review_ready', 'upload_failed', 'transcription_failed', 'extraction_failed'].some((s) =>
        isNoteProcessing(s as never),
      ),
    ).toBe(false);
  });

  it('is false before the note has loaded', () => {
    expect(isNoteProcessing(undefined)).toBe(false);
  });

  it('is false when queued but blocked by the daily AI quota', () => {
    expect(isNoteProcessing('queued', 'rate_limited')).toBe(false);
    expect(isNoteProcessing('queued', 'usage_count_failed')).toBe(false);
    expect(isQuotaBlocked('rate_limited')).toBe(true);
  });
});

describe('noteRefetchIntervalMs', () => {
  it('polls every 2s while processing and stops once done or failed', () => {
    expect(noteRefetchIntervalMs('transcribing')).toBe(2000);
    expect(noteRefetchIntervalMs('review_ready')).toBe(false);
    expect(noteRefetchIntervalMs('extraction_failed')).toBe(false);
    expect(noteRefetchIntervalMs(undefined)).toBe(false);
    expect(noteRefetchIntervalMs('queued', 'rate_limited')).toBe(false);
  });
});

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
    expect(() => assertNoteStatusTransition('review_ready', 'draft')).toThrow(
      /Invalid note status transition: review_ready -> draft/,
    );
  });
});

describe('isRetryableProcessing', () => {
  it('allows queued and both failure statuses', () => {
    expect(isRetryableProcessing('queued')).toBe(true);
    expect(isRetryableProcessing('transcription_failed')).toBe(true);
    expect(isRetryableProcessing('extraction_failed')).toBe(true);
    expect(isRetryableProcessing('extracting')).toBe(false);
  });
});

describe('Phase 4 status transitions', () => {
  it('allows extracting to extraction_failed and retry back to extracting', () => {
    expect(canTransitionNoteStatus('extracting', 'extraction_failed')).toBe(
      true,
    );
    expect(canTransitionNoteStatus('extraction_failed', 'extracting')).toBe(
      true,
    );
    expect(canTransitionNoteStatus('transcribing', 'extracting')).toBe(true);
  });
});

describe('retryProcessingPlan', () => {
  it('re-extracts from the stored transcript when extraction failed', () => {
    expect(
      retryProcessingPlan({
        status: 'extraction_failed',
        transcript: ' Call the vendor ',
        audio_purged_at: null,
      }),
    ).toBe('extract');
  });

  it('still re-extracts after the audio file has been purged', () => {
    expect(
      retryProcessingPlan({
        status: 'extraction_failed',
        transcript: 'Call the vendor',
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('extract');
    expect(
      retryProcessingPlan({
        status: 'transcription_failed',
        transcript: 'Call the vendor',
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('extract');
    expect(
      retryProcessingPlan({
        status: 'extracting',
        transcript: 'Call the vendor',
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('extract');
  });

  it('re-transcribes when the audio file is still available', () => {
    expect(
      retryProcessingPlan({
        status: 'transcription_failed',
        transcript: 'partial',
        audio_purged_at: null,
      }),
    ).toBe('transcribe');
    expect(
      retryProcessingPlan({
        status: 'queued',
        transcript: null,
        audio_purged_at: null,
      }),
    ).toBe('transcribe');
    expect(
      retryProcessingPlan({
        status: 'extraction_failed',
        transcript: '   ',
        audio_purged_at: null,
      }),
    ).toBe('transcribe');
  });

  it('does not send a purged note without a transcript back to speech-to-text', () => {
    expect(
      retryProcessingPlan({
        status: 'transcription_failed',
        transcript: '   ',
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('audio_gone');
    expect(
      retryProcessingPlan({
        status: 'queued',
        transcript: null,
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('audio_gone');
  });
});

describe('showProcessingRetry', () => {
  const purgedAt = '2026-04-10T00:00:00.000Z';

  it('offers retry while audio remains or a transcript can be re-extracted', () => {
    expect(
      showProcessingRetry({
        status: 'transcription_failed',
        transcript: null,
        audio_purged_at: null,
      }),
    ).toBe(true);
    expect(
      showProcessingRetry({
        status: 'transcription_failed',
        transcript: 'Call the vendor',
        audio_purged_at: purgedAt,
      }),
    ).toBe(true);
    expect(
      showProcessingRetry({
        status: 'extracting',
        transcript: 'Call the vendor',
        audio_purged_at: purgedAt,
      }),
    ).toBe(true);
  });

  it('does not offer retry for a stuck extracting note while the file remains', () => {
    expect(
      showProcessingRetry({
        status: 'extracting',
        transcript: 'Call the vendor',
        audio_purged_at: null,
      }),
    ).toBe(false);
  });

  it('hides retry when the file is gone and there is no transcript', () => {
    expect(
      showProcessingRetry({
        status: 'transcription_failed',
        transcript: null,
        audio_purged_at: purgedAt,
      }),
    ).toBe(false);
    expect(
      showProcessingRetry({
        status: 'queued',
        transcript: '   ',
        audio_purged_at: purgedAt,
      }),
    ).toBe(false);
    expect(
      audioRetryUnavailableLabel({
        status: 'transcription_failed',
        transcript: null,
        audio_purged_at: purgedAt,
      }),
    ).toBe(AUDIO_RETRY_UNAVAILABLE_LABEL);
    expect(
      audioRetryUnavailableLabel({
        status: 'extraction_failed',
        transcript: 'Call the vendor',
        audio_purged_at: purgedAt,
      }),
    ).toBeNull();
  });
});

describe('isNoteAudioPurged', () => {
  it('is true only when retention stamped a time', () => {
    expect(isNoteAudioPurged({ audio_purged_at: null })).toBe(false);
    expect(isNoteAudioPurged({ audio_purged_at: '  ' })).toBe(false);
    expect(
      isNoteAudioPurged({ audio_purged_at: '2026-04-10T00:00:00.000Z' }),
    ).toBe(true);
    expect(AUDIO_DELETED_LABEL).toBe('Audio deleted after 3 days');
  });
});

describe('canPlayNoteAudio', () => {
  it('allows playback once upload stored audio and retention has not purged it', () => {
    expect(
      canPlayNoteAudio({ audio_mime_type: 'audio/mp4', audio_purged_at: null }),
    ).toBe(true);
  });

  it('blocks playback before upload persisted audio (draft / upload_failed)', () => {
    expect(canPlayNoteAudio({ audio_mime_type: null, audio_purged_at: null })).toBe(false);
    expect(canPlayNoteAudio({ audio_mime_type: '  ', audio_purged_at: null })).toBe(false);
  });

  it('blocks playback after the 3-day retention purge', () => {
    expect(
      canPlayNoteAudio({
        audio_mime_type: 'audio/webm',
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});

describe('noteStatusLabel', () => {
  it('replaces underscores for display', () => {
    expect(noteStatusLabel('transcription_failed')).toBe('transcription failed');
    expect(noteStatusLabel('queued')).toBe('queued');
  });
});

describe('noteStatusShort', () => {
  it('maps statuses to short card labels', () => {
    expect(noteStatusShort('review_ready')).toBe('Ready');
    expect(noteStatusShort('transcribing')).toBe('Live');
    expect(noteStatusShort('transcription_failed')).toBe('Fail');
    expect(noteStatusShort('draft')).toBe('Draft');
  });

  it('shows Limit when the daily quota blocked processing', () => {
    expect(noteStatusShort('queued', 'rate_limited')).toBe('Limit');
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

describe('displayTranscript / noteMatchesSearch', () => {
  it('prefers edited transcript', () => {
    expect(
      displayTranscript({
        transcript: 'original',
        edited_transcript: ' edited ',
      }),
    ).toBe('edited');
  });

  it('matches title or transcript text', () => {
    const note = {
      title: 'Grocery list',
      transcript: 'Buy milk tomorrow',
      edited_transcript: null,
    };
    expect(noteMatchesSearch(note, 'milk')).toBe(true);
    expect(noteMatchesSearch(note, ' GROCERY ')).toBe(true);
    expect(noteMatchesSearch(note, 'eggs')).toBe(false);
  });

  it('matches punctuation literally (follow_up is not followup)', () => {
    const note = { title: null, transcript: 'send the follow_up deck', edited_transcript: null };
    expect(noteMatchesSearch(note, 'follow_up')).toBe(true);
    expect(noteMatchesSearch(note, 'followup')).toBe(false);
  });
});
