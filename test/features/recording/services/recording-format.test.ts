import { describe, expect, it } from 'vitest';

import {
  audioMimeForUpload,
  extensionForMime,
  isWebmAudio,
  mimeFromUri,
  pickWebRecordingMime,
} from '@/features/recording/services/recording-format';

describe('pickWebRecordingMime', () => {
  it('prefers AAC-in-MP4 (iPhone-playable) when the browser can record it', () => {
    expect(pickWebRecordingMime(() => true)).toBe('audio/mp4;codecs=mp4a.40.2');
  });

  it('falls back to plain MP4 when AAC is not available', () => {
    expect(pickWebRecordingMime((mime) => mime === 'audio/mp4')).toBe('audio/mp4');
  });

  it('returns undefined when no MP4 is supported (browser default, e.g. Firefox WebM)', () => {
    expect(pickWebRecordingMime((mime) => mime === 'audio/webm')).toBeUndefined();
  });
});

describe('audioMimeForUpload', () => {
  it('uses the real recorded blob type over the URI guess and drops codec params', () => {
    expect(audioMimeForUpload('audio/webm;codecs=opus', 'audio/mp4')).toBe('audio/webm');
    expect(audioMimeForUpload('Audio/MP4', 'audio/webm')).toBe('audio/mp4');
  });

  it('keeps the fallback when the blob has no usable audio type', () => {
    expect(audioMimeForUpload('', 'audio/mp4')).toBe('audio/mp4');
    expect(audioMimeForUpload('application/octet-stream', 'audio/mp4')).toBe('audio/mp4');
  });
});

describe('isWebmAudio', () => {
  it('detects the WebM EBML header', () => {
    expect(isWebmAudio(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f]))).toBe(true);
  });

  it('does not flag MP4 (ftyp box) or truncated data', () => {
    const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
    expect(isWebmAudio(mp4)).toBe(false);
    expect(isWebmAudio(new Uint8Array([0x1a, 0x45]))).toBe(false);
  });
});

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
