import { describe, expect, it } from 'vitest';

import { extensionForMime, mimeFromUri } from './recording-format';

describe('extensionForMime', () => {
  it('maps common recording MIME types', () => {
    expect(extensionForMime('audio/webm')).toBe('webm');
    expect(extensionForMime('audio/wav')).toBe('wav');
    expect(extensionForMime('audio/mpeg')).toBe('mp3');
    expect(extensionForMime('audio/mp3')).toBe('mp3');
  });

  it('defaults unknown types to m4a', () => {
    expect(extensionForMime('audio/mp4')).toBe('m4a');
    expect(extensionForMime('application/octet-stream')).toBe('m4a');
  });
});

describe('mimeFromUri', () => {
  it('infers MIME from file extension case-insensitively', () => {
    expect(mimeFromUri('file:///tmp/clip.WEBM')).toBe('audio/webm');
    expect(mimeFromUri('/recordings/a.wav')).toBe('audio/wav');
    expect(mimeFromUri('note.mp3')).toBe('audio/mpeg');
  });

  it('defaults unknown extensions to audio/mp4', () => {
    expect(mimeFromUri('file:///tmp/original.m4a')).toBe('audio/mp4');
    expect(mimeFromUri('file:///tmp/original')).toBe('audio/mp4');
  });
});
