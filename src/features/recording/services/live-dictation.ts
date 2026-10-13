/**
 * Best-effort live transcript preview (prototype “Your thought”).
 * Web Speech only — product capture still records via expo-audio.
 * Native returns null (type into the field instead).
 */

type SpeechResultLike = { 0?: { transcript?: string } };
type SpeechRecLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<SpeechResultLike> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export function transcriptFromSpeechResults(
  results: ArrayLike<SpeechResultLike>,
): string {
  let txt = '';
  for (let i = 0; i < results.length; i++) {
    txt += results[i]?.[0]?.transcript ?? '';
  }
  return txt;
}

function getSpeechCtor(): (new () => SpeechRecLike) | null {
  if (typeof globalThis === 'undefined') return null;
  const w = globalThis as unknown as {
    window?: {
      SpeechRecognition?: new () => SpeechRecLike;
      webkitSpeechRecognition?: new () => SpeechRecLike;
    };
    SpeechRecognition?: new () => SpeechRecLike;
    webkitSpeechRecognition?: new () => SpeechRecLike;
  };
  const scope = w.window ?? w;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isLiveDictationAvailable(): boolean {
  return getSpeechCtor() !== null;
}

export type LiveDictationSession = {
  stop: () => void;
};

/** Start continuous interim dictation; returns null when unsupported. */
export function startLiveDictation(opts: {
  lang?: string;
  /** Text already in the field before this session. */
  baseText: string;
  onUpdate: (fullText: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): LiveDictationSession | null {
  const Ctor = getSpeechCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = opts.lang ?? 'en-US';
  const prefix = opts.baseText.trim() ? `${opts.baseText.trimEnd()} ` : '';

  rec.onresult = (e) => {
    opts.onUpdate(prefix + transcriptFromSpeechResults(e.results));
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed') {
      opts.onError?.('Microphone access was blocked for live preview');
    }
  };
  rec.onend = () => opts.onEnd?.();

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // already stopped
      }
    },
  };
}
