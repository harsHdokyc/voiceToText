import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { captureNote } from '@/features/notes/services/notes-service';

type Row = Record<string, unknown> & { id: string; status: string };

const fake = vi.hoisted(() => ({
  notes: new Map<string, Row>(),
  signedIn: true,
  failContentUpdate: false,
  failUpload: false,
  failProcess: false,
}));

vi.mock('@/lib/supabase', () => {
  function notesTable() {
    let op: 'insert' | 'update' = 'insert';
    let payload: Record<string, unknown> = {};
    let id = '';
    const run = async () => {
      if (op === 'insert') {
        const row: Row = {
          id: `note-${fake.notes.size + 1}`,
          title: null,
          transcript: null,
          edited_transcript: null,
          audio_purged_at: null,
          ...payload,
          status: String(payload.status),
        };
        fake.notes.set(row.id, row);
        return { data: row, error: null };
      }
      if (fake.failContentUpdate) {
        return { data: null, error: { message: 'connection reset', code: 'network' } };
      }
      const row = fake.notes.get(id);
      if (!row) return { data: null, error: null };
      Object.assign(row, payload);
      return { data: row, error: null };
    };
    const q = {
      insert: (row: Record<string, unknown>) => ((op = 'insert'), (payload = row), q),
      update: (body: Record<string, unknown>) => ((op = 'update'), (payload = body), q),
      eq: (col: string, value: string) => (col === 'id' && (id = value), q),
      select: () => q,
      single: run,
      maybeSingle: run,
    };
    return q;
  }

  return {
    supabase: {
      auth: {
        getUser: async () => ({
          data: { user: fake.signedIn ? { id: 'user-1' } : null },
          error: null,
        }),
      },
      from: () => notesTable(),
      functions: {
        invoke: async (fn: string, opts?: { body?: { noteId: string } }) => {
          const noteId = opts?.body?.noteId ?? '';
          if (fn === 'delete-note') {
            fake.notes.delete(noteId);
            return { data: { ok: true }, error: null };
          }
          if (fn === 'process-note') {
            if (fake.failProcess) {
              return {
                data: { ok: false, error: 'provider_unavailable', reason: 'Transcription provider timed out' },
                error: { message: 'Edge Function returned a non-2xx status code' },
              };
            }
            fake.notes.get(noteId)!.status = 'review_ready';
            return { data: { ok: true, status: 'review_ready' }, error: null };
          }
          throw new Error(`unexpected edge function ${fn}`);
        },
      },
    },
  };
});

vi.mock('@/features/notes/services/note-audio-proxy', () => ({
  proxyUploadNoteAudio: async (p: { noteId: string; mimeType: string; durationSeconds: number }) => {
    if (fake.failUpload) throw new ApiError('upload_rejected', 'Storage quota exceeded');
    const row = fake.notes.get(p.noteId)!;
    Object.assign(row, {
      status: 'queued',
      audio_mime_type: p.mimeType,
      audio_duration_seconds: p.durationSeconds,
    });
    return row;
  },
}));

const clip = { uri: 'file:///rec/1.m4a', durationSeconds: 12 };

beforeEach(() => {
  fake.notes.clear();
  fake.signedIn = true;
  fake.failContentUpdate = false;
  fake.failUpload = false;
  fake.failProcess = false;
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['audio'], { type: 'audio/mp4' }),
  }));
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('captureNote', () => {
  it('saves a typed thought as a trimmed draft note without processing', async () => {
    const note = await captureNote({ title: '  Call Sam ', thought: ' pricing follow-up  ', clip: null, process: false });

    expect([...fake.notes.values()]).toEqual([
      expect.objectContaining({ id: note.id, status: 'draft', title: 'Call Sam', edited_transcript: 'pricing follow-up' }),
    ]);
  });

  it('uploads the clip and runs processing when asked', async () => {
    const note = await captureNote({ title: '', thought: '', clip, process: true });

    expect(fake.notes.size).toBe(1);
    expect(fake.notes.get(note.id)).toMatchObject({
      status: 'review_ready',
      audio_mime_type: 'audio/mp4',
      audio_duration_seconds: 12,
    });
  });

  it('uploads a web blob with the recorded type, not the extension-less URI guess', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(['audio'], { type: 'audio/webm;codecs=opus' }),
    }));

    const note = await captureNote({ title: '', thought: '', clip: { uri: 'blob:http://localhost/abc', durationSeconds: 5 }, process: false });

    expect(fake.notes.get(note.id)?.audio_mime_type).toBe('audio/webm');
  });

  it('deletes the half-made draft and rethrows when the audio upload fails', async () => {
    fake.failUpload = true;

    await expect(captureNote({ title: 'Idea', thought: '', clip, process: true })).rejects.toMatchObject({
      code: 'upload_rejected',
      reason: 'Storage quota exceeded',
    });
    expect(fake.notes.size).toBe(0);
  });

  it('deletes the draft when saving the title fails before any upload', async () => {
    fake.failContentUpdate = true;

    await expect(captureNote({ title: 'Idea', thought: '', clip, process: true })).rejects.toMatchObject({
      message: 'connection reset',
    });
    expect(fake.notes.size).toBe(0);
  });

  it('keeps the stored note (queued, retryable) when processing fails after upload', async () => {
    fake.failProcess = true;

    const note = await captureNote({ title: '', thought: '', clip, process: true });

    expect(fake.notes.size).toBe(1);
    expect(fake.notes.get(note.id)?.status).toBe('queued');
  });

  it('creates nothing when the user is signed out', async () => {
    fake.signedIn = false;

    await expect(captureNote({ title: 'Idea', thought: '', clip: null, process: false })).rejects.toMatchObject({
      code: 'not_signed_in',
    });
    expect(fake.notes.size).toBe(0);
  });
});
