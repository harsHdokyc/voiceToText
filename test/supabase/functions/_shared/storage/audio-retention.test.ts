import { describe, expect, it } from 'vitest';

import {
  AUDIO_RETENTION_MS,
  audioRetentionCutoff,
  hasStoredTranscript,
  isAudioPurgeEligible,
  storageDeleteConfirmed,
  type AudioPurgeCandidate,
} from '@supabaseShared/storage/audio-retention';

const NOW = new Date('2026-04-10T12:00:00.000Z');
const PATH = 'user-1/notes/note-1/original.m4a';

function candidate(
  overrides: Partial<AudioPurgeCandidate> = {},
): AudioPurgeCandidate {
  return {
    audio_path: PATH,
    audio_purged_at: null,
    created_at: new Date(NOW.getTime() - AUDIO_RETENTION_MS).toISOString(),
    status: 'review_ready',
    transcript: 'Buy milk tomorrow',
    ...overrides,
  };
}

describe('isAudioPurgeEligible', () => {
  it('purges a review-ready note once it is 3 days old and has a transcript', () => {
    expect(isAudioPurgeEligible(candidate(), NOW)).toBe(true);
  });

  it('purges an extraction_failed note that still has a transcript', () => {
    expect(
      isAudioPurgeEligible(candidate({ status: 'extraction_failed' }), NOW),
    ).toBe(true);
  });

  it('keeps audio until the note is a full 3 days old', () => {
    const createdAt = new Date(NOW.getTime() - AUDIO_RETENTION_MS + 1);
    expect(
      isAudioPurgeEligible(
        candidate({ created_at: createdAt.toISOString() }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isAudioPurgeEligible(
        candidate({
          created_at: new Date(NOW.getTime() - AUDIO_RETENTION_MS).toISOString(),
        }),
        NOW,
      ),
    ).toBe(true);
  });

  it('keeps audio for notes still processing or waiting on transcription', () => {
    const kept = [
      'draft',
      'uploading',
      'queued',
      'transcribing',
      'extracting',
      'upload_failed',
      'transcription_failed',
    ];
    for (const status of kept) {
      expect(isAudioPurgeEligible(candidate({ status }), NOW)).toBe(false);
    }
  });

  it('keeps audio when there is no stored transcript to fall back on', () => {
    expect(
      isAudioPurgeEligible(candidate({ transcript: null }), NOW),
    ).toBe(false);
    expect(
      isAudioPurgeEligible(candidate({ transcript: '   ' }), NOW),
    ).toBe(false);
    expect(hasStoredTranscript('  hello ')).toBe(true);
  });

  it('does not select a note whose file was already purged or is missing', () => {
    expect(
      isAudioPurgeEligible(
        candidate({ audio_purged_at: '2026-04-10T00:00:00.000Z' }),
        NOW,
      ),
    ).toBe(false);
    expect(isAudioPurgeEligible(candidate({ audio_path: null }), NOW)).toBe(
      false,
    );
    expect(isAudioPurgeEligible(candidate({ audio_path: '  ' }), NOW)).toBe(
      false,
    );
  });

  it('rejects an unreadable created_at', () => {
    expect(
      isAudioPurgeEligible(candidate({ created_at: 'not-a-date' }), NOW),
    ).toBe(false);
  });
});

describe('audioRetentionCutoff', () => {
  it('is exactly 3 days before now', () => {
    expect(audioRetentionCutoff(NOW).toISOString()).toBe(
      '2026-04-07T12:00:00.000Z',
    );
  });
});

describe('storageDeleteConfirmed', () => {
  it('confirms a remove that returns the object path', () => {
    expect(storageDeleteConfirmed(null, [{ name: PATH }], PATH)).toBe(true);
    expect(
      storageDeleteConfirmed(null, [{ name: 'original.m4a' }], PATH),
    ).toBe(true);
  });

  it('treats not-found and an empty success list as already gone', () => {
    expect(
      storageDeleteConfirmed({ message: 'Object not found', statusCode: 404 }, [], PATH),
    ).toBe(true);
    expect(
      storageDeleteConfirmed({ message: 'The resource does not exist' }, null, PATH),
    ).toBe(true);
    expect(storageDeleteConfirmed(null, [], PATH)).toBe(true);
  });

  it('does not confirm a different object or a real storage error', () => {
    expect(
      storageDeleteConfirmed(null, [{ name: 'other/original.m4a' }], PATH),
    ).toBe(false);
    expect(
      storageDeleteConfirmed({ message: 'network down', status: 500 }, null, PATH),
    ).toBe(false);
    expect(storageDeleteConfirmed(null, [], '  ')).toBe(false);
  });
});
