import { describe, expect, it } from 'vitest';

import { buildNoteAudioPath } from '@supabaseShared/storage/note-audio-path';

describe('buildNoteAudioPath (edge shared)', () => {
  it('uses uid/notes/noteId ownership layout', () => {
    expect(
      buildNoteAudioPath({
        userId: 'user-1',
        noteId: 'note-2',
        extension: 'm4a',
      }),
    ).toBe('user-1/notes/note-2/original.m4a');
  });
});
