/** Pure MIME/extension helpers for note audio upload paths. */

export function extensionForMime(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'm4a';
}

/** Web recorder formats iOS can play, best first; none supported → browser default (WebM). */
const WEB_RECORDING_MIME_CANDIDATES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

export function pickWebRecordingMime(isTypeSupported: (mime: string) => boolean) {
  return WEB_RECORDING_MIME_CANDIDATES.find((mime) => isTypeSupported(mime));
}

/**
 * Web blob URIs carry no extension, so trust the recorded blob's real type when it has one.
 * Codec params are dropped (`audio/webm;codecs=opus` → `audio/webm`).
 */
export function audioMimeForUpload(blobType: string, fallback: string) {
  const type = blobType.split(';')[0].trim().toLowerCase();
  return type.startsWith('audio/') ? type : fallback;
}

/** WebM/Matroska EBML header — AVFoundation (iOS) cannot decode it. */
export function isWebmAudio(bytes: Uint8Array) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  );
}

export function mimeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  return 'audio/mp4';
}
