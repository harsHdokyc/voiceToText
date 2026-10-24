/**
 * App toast — one message at a time. Prototype used Sonner (web-only);
 * this is a tiny RN+web store so callers share one interface.
 */

export type ToastTone = 'default' | 'destructive';

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type Listener = (toast: Toast | null) => void;

let current: Toast | null = null;
let seq = 0;
const listeners = new Set<Listener>();

function publish() {
  for (const listener of listeners) listener(current);
}

/** True when someone tried to put a structured [vtw] log line on screen. */
export function isStructuredLogDump(message: string) {
  const t = message.trim();
  return t.startsWith('[vtw]') || (t.includes('"src":') && t.includes('"scope":'));
}

/** Show a short feedback banner. Empty messages and [vtw] log dumps are ignored. */
export function showToast(
  message: string,
  opts?: { tone?: ToastTone },
): void {
  const text = message.trim();
  if (!text || isStructuredLogDump(text)) return;
  current = {
    id: ++seq,
    message: text,
    tone: opts?.tone ?? 'default',
  };
  publish();
}

export function clearToast(): void {
  if (!current) return;
  current = null;
  publish();
}

/** Subscribe to the active toast. Returns unsubscribe. */
export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
