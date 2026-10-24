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

/** Show a short feedback banner. Empty messages are ignored. */
export function showToast(
  message: string,
  opts?: { tone?: ToastTone },
): void {
  const text = message.trim();
  if (!text) return;
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
