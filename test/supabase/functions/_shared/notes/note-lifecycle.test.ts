import { describe, expect, it } from 'vitest';

import {
  isStuckExtracting,
  noteLifecycle,
  STUCK_EXTRACTING_MS,
  TRANSCRIBE_CLAIMABLE,
  UPLOAD_CLAIMABLE,
} from '@supabaseShared/notes/note-lifecycle';

type Row = Record<string, unknown>;

/** In-memory `notes` table with the PostgREST calls note-lifecycle uses. */
function notesTable(rows: Row[]) {
  return {
    rows,
    from() {
      let patch: Row | null = null;
      const filters: ((r: Row) => boolean)[] = [];
      const q = {
        update(p: Row) { patch = p; return q; },
        select() { return q; },
        eq(k: string, v: unknown) { filters.push((r) => r[k] === v); return q; },
        in(k: string, vs: unknown[]) { filters.push((r) => vs.includes(r[k])); return q; },
        async maybeSingle() {
          const hit = rows.find((r) => filters.every((f) => f(r)));
          if (hit && patch) Object.assign(hit, patch);
          return { data: hit ? { ...hit } : null, error: null };
        },
      };
      return q;
    },
  };
}

const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const clock = () => NOW;

function note(status: string, extra: Row = {}): Row {
  return { id: 'n1', user_id: 'u1', status, last_error_code: 'old', ...extra };
}

describe('noteLifecycle', () => {
  it('claims a queued note for transcription and clears the last error', async () => {
    const db = notesTable([note('queued', { processing_attempts: 1 })]);
    const { row } = await noteLifecycle(db, 'n1', 'u1', clock)
      .claim('transcribe', TRANSCRIBE_CLAIMABLE, { processing_attempts: 2 });

    expect(row).not.toBeNull();
    expect(db.rows[0]).toMatchObject({
      status: 'transcribing',
      last_error_code: null,
      processing_attempts: 2,
      updated_at: '2026-10-23T12:00:00.000Z',
    });
  });

  it('loses the claim when the note already left the claimable statuses', async () => {
    const db = notesTable([note('transcribing')]);
    const { row } = await noteLifecycle(db, 'n1', 'u1', clock)
      .claim('transcribe', TRANSCRIBE_CLAIMABLE);

    expect(row).toBeNull();
    expect(db.rows[0]!.status).toBe('transcribing');
  });

  it("never claims another user's note", async () => {
    const db = notesTable([note('draft', { user_id: 'someone-else' })]);
    const { row } = await noteLifecycle(db, 'n1', 'u1', clock).claim('upload', UPLOAD_CLAIMABLE);

    expect(row).toBeNull();
    expect(db.rows[0]!.status).toBe('draft');
  });

  it('completes upload -> queued only from uploading, storing the audio fields', async () => {
    const db = notesTable([note('uploading')]);
    await noteLifecycle(db, 'n1', 'u1', clock).complete('upload', 'queued', {
      audio_path: 'u1/notes/n1/original.m4a',
    });

    expect(db.rows[0]).toMatchObject({
      status: 'queued',
      audio_path: 'u1/notes/n1/original.m4a',
      last_error_code: null,
    });
  });

  it('does not complete extraction when the note is no longer extracting', async () => {
    const db = notesTable([note('extraction_failed')]);
    const { row } = await noteLifecycle(db, 'n1', 'u1', clock)
      .complete('extract', 'review_ready', { title: 'x' });

    expect(row).toBeNull();
    expect(db.rows[0]!.status).toBe('extraction_failed');
    expect(db.rows[0]).not.toHaveProperty('title');
  });

  it('fails each stage into its own *_failed status with a truncated code', async () => {
    const db = notesTable([
      note('uploading', { id: 'a' }),
      note('transcribing', { id: 'b' }),
      note('extracting', { id: 'c' }),
    ]);
    await noteLifecycle(db, 'a', 'u1', clock).fail('upload', 'storage_upload_failed');
    await noteLifecycle(db, 'b', 'u1', clock).fail('transcribe', 'x'.repeat(100));
    await noteLifecycle(db, 'c', 'u1', clock).fail('extract', 'upstream_unavailable');

    expect(db.rows.map((r) => r.status)).toEqual([
      'upload_failed',
      'transcription_failed',
      'extraction_failed',
    ]);
    expect(db.rows[1]!.last_error_code).toBe('x'.repeat(80));
  });

  it('does not mark a note failed if it already moved past the working status', async () => {
    const db = notesTable([note('review_ready')]);
    await noteLifecycle(db, 'n1', 'u1', clock).fail('extract', 'boom');

    expect(db.rows[0]!.status).toBe('review_ready');
  });

  describe('reclaimStuckExtracting', () => {
    it('flips an extracting note older than the stale window to extraction_failed', async () => {
      const staleAt = new Date(NOW - STUCK_EXTRACTING_MS - 1).toISOString();
      const db = notesTable([note('extracting', { updated_at: staleAt })]);

      expect(await noteLifecycle(db, 'n1', 'u1', clock).reclaimStuckExtracting()).toBe(true);
      expect(db.rows[0]).toMatchObject({
        status: 'extraction_failed',
        last_error_code: 'stuck_extracting',
      });
    });

    it('leaves a fresh extracting note alone', async () => {
      const freshAt = new Date(NOW - 30_000).toISOString();
      const db = notesTable([note('extracting', { updated_at: freshAt })]);

      expect(await noteLifecycle(db, 'n1', 'u1', clock).reclaimStuckExtracting()).toBe(false);
      expect(db.rows[0]!.status).toBe('extracting');
    });
  });
});

describe('isStuckExtracting', () => {
  it('is true only for extracting older than the stale window', () => {
    const staleAt = new Date(NOW - STUCK_EXTRACTING_MS - 1).toISOString();
    expect(isStuckExtracting('extracting', staleAt, NOW)).toBe(true);
  });

  it('is false when still fresh, wrong status, or bad timestamp', () => {
    const freshAt = new Date(NOW - 30_000).toISOString();
    expect(isStuckExtracting('extracting', freshAt, NOW)).toBe(false);
    expect(isStuckExtracting('review_ready', freshAt, NOW)).toBe(false);
    expect(isStuckExtracting('extracting', 'not-a-date', NOW)).toBe(false);
    expect(isStuckExtracting(null, null, NOW)).toBe(false);
  });
});
