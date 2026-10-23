/**
 * Native live transcript preview via expo-speech-recognition (dev build only).
 * Expo Go has no native module, so this returns null there and capture still
 * records audio for server transcription.
 */
import type { ExpoSpeechRecognitionModule as SpeechModule } from 'expo-speech-recognition';

import { applySpeechResult } from '@/features/recording/services/speech-text';

let speech: typeof SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module is absent in Expo Go; a static import would crash there
  speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  speech = null;
}

export function isLiveDictationAvailable(): boolean {
  try {
    return speech?.isRecognitionAvailable() ?? false;
  } catch {
    return false;
  }
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
  const mod = speech;
  if (!mod || !isLiveDictationAvailable()) return null;

  let committed = opts.baseText;
  let stopped = false;
  const subs = [
    mod.addListener('result', (e) => {
      const next = applySpeechResult(committed, e.results[0]?.transcript ?? '', e.isFinal);
      committed = next.committed;
      opts.onUpdate(next.display);
    }),
    mod.addListener('error', (e) => {
      if (e.error === 'not-allowed') {
        opts.onError?.('Speech recognition permission was denied');
      }
    }),
    mod.addListener('end', () => opts.onEnd?.()),
  ];
  const removeAll = () => subs.forEach((sub) => sub.remove());

  void mod
    .requestPermissionsAsync()
    .then(({ granted }) => {
      if (stopped) return;
      if (!granted) {
        opts.onError?.('Speech recognition permission was denied');
        removeAll();
        return;
      }
      mod.start({
        lang: opts.lang ?? 'en-US',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
    })
    .catch(() => removeAll());

  return {
    stop: () => {
      stopped = true;
      removeAll();
      try {
        mod.stop();
      } catch {
        // already stopped
      }
    },
  };
}
