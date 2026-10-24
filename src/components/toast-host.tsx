import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import {
  clearToast,
  subscribeToast,
  type Toast,
} from '@/lib/toast';

const DISMISS_MS = 2800;

/** Root overlay — mounts once in AppProviders. Call `showToast` from anywhere. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast?.id]);

  if (!toast) return null;

  const destructive = toast.tone === 'destructive';

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-0 z-[200] items-center px-4"
      style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        onPress={clearToast}
        className={cn(
          'w-full max-w-md rounded-lg border px-4 py-3',
          destructive
            ? 'border-destructive bg-destructive'
            : 'border-ink bg-ink',
        )}
      >
        <Text
          className={cn(
            'font-sans-medium text-sm leading-5',
            destructive ? 'text-card' : 'text-paper',
          )}
        >
          {toast.message}
        </Text>
      </Pressable>
    </View>
  );
}
