import { describe, expect, it } from 'vitest';

import {
  AUDIO_RETENTION_MS,
  audioRetentionCutoff,
  hasStoredTranscript,
  isAudioPurgeEligible,
  isOrphanAudioDeletable,
  reextractClaimStatuses,
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
  it('purges every status once the note is 3 days old, with or without a transcript', () => {
    const statuses = [
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
    ];
    for (const status of statuses) {
      expect(isAudioPurgeEligible(candidate({ status, transcript: null }), NOW)).toBe(
        true,
      );
      expect(
        isAudioPurgeEligible(candidate({ status, transcript: 'Buy milk' }), NOW),
      ).toBe(true);
    }
    expect(hasStoredTranscript('  hello ')).toBe(true);
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

describe('isOrphanAudioDeletable', () => {
  const old = new Date(NOW.getTime() - AUDIO_RETENTION_MS).toISOString();

  it('deletes an unreferenced object once it is 3 days old', () => {
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: old,
          updated_at: old,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('keeps objects a note still references, young uploads, and folder placeholders', () => {
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: old,
          updated_at: old,
          referenced_by_note: true,
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: old,
          updated_at: NOW.toISOString(),
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
    const young = new Date(NOW.getTime() - AUDIO_RETENTION_MS + 1).toISOString();
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: young,
          updated_at: young,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isOrphanAudioDeletable(
        {
          name: 'user-1/notes/',
          created_at: old,
          updated_at: old,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isOrphanAudioDeletable(
        {
          name: '  ',
          created_at: old,
          updated_at: old,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: old,
          updated_at: null,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
    expect(
      isOrphanAudioDeletable(
        {
          name: PATH,
          created_at: 'not-a-date',
          updated_at: old,
          referenced_by_note: false,
        },
        NOW,
      ),
    ).toBe(false);
  });
});

describe('reextractClaimStatuses', () => {
  it('re-extracts extraction failures that already have a transcript', () => {
    expect(
      reextractClaimStatuses({
        status: 'extraction_failed',
        transcript: ' Call the vendor ',
        audio_path: PATH,
        audio_purged_at: null,
      }),
    ).toEqual(['extraction_failed', 'extracting']);
  });

  it('re-extracts a purged transcription failure and leaves the file alone while it remains', () => {
    expect(
      reextractClaimStatuses({
        status: 'transcription_failed',
        transcript: 'Call the vendor',
        audio_path: null,
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toEqual(['transcription_failed', 'queued']);
    expect(
      reextractClaimStatuses({
        status: 'transcription_failed',
        transcript: 'Call the vendor',
        audio_path: PATH,
        audio_purged_at: null,
      }),
    ).toBeNull();
  });

  it('does not re-extract when there is no transcript', () => {
    expect(
      reextractClaimStatuses({
        status: 'queued',
        transcript: '  ',
        audio_path: null,
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBeNull();
    expect(
      reextractClaimStatuses({
        status: 'review_ready',
        transcript: 'Call the vendor',
        audio_path: null,
        audio_purged_at: '2026-04-10T00:00:00.000Z',
      }),
    ).toBeNull();
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
