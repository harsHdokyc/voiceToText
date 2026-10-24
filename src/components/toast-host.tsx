import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkspaceDesktop } from '@/components/workspace-page';
import { cn } from '@/lib/cn';
import {
  clearToast,
  subscribeToast,
  type Toast,
} from '@/lib/toast';
import { colors, space } from '@/theme';

/** Visible dwell after enter (Material snackbars ~2.5–4s). */
const DISMISS_MS = 3000;
const ENTER_MS = 320;
const EXIT_MS = 220;
const SLIDE = 28;
/** Matches workspace-shell mobile bottom tab bar height. */
const MOBILE_TAB_BAR = 72;
const EASE = Easing.bezier(0.33, 1, 0.68, 1);

/**
 * Snackbar host — bottom-center (Material / Greenhouse), above the mobile tab bar.
 * Slides up + fades in; reverse on dismiss. `showToast` from anywhere.
 */
export function ToastHost() {
  const desktop = useWorkspaceDesktop();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SLIDE);

  const bottomPad = desktop
    ? Math.max(insets.bottom, space[6])
    : MOBILE_TAB_BAR + Math.max(insets.bottom, space[2]) + space[3];

  useEffect(() => subscribeToast(setToast), []);

  useEffect(() => {
    if (!toast) {
      opacity.value = 0;
      translateY.value = SLIDE;
      return;
    }

    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
    } else {
      opacity.value = 0;
      translateY.value = SLIDE;
      opacity.value = withTiming(1, { duration: ENTER_MS, easing: EASE });
      translateY.value = withTiming(0, { duration: ENTER_MS, easing: EASE });
    }

    const id = setTimeout(() => dismiss(), DISMISS_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when toast identity changes
  }, [toast?.id, reduced]);

  function finishClear() {
    clearToast();
  }

  function dismiss() {
    if (reduced) {
      finishClear();
      return;
    }
    opacity.value = withTiming(0, { duration: EXIT_MS, easing: EASE }, (done) => {
      if (done) runOnJS(finishClear)();
    });
    translateY.value = withTiming(SLIDE * 0.6, {
      duration: EXIT_MS,
      easing: EASE,
    });
  }

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const destructive = toast.tone === 'destructive';

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 z-[200] items-center px-4"
      style={{ paddingBottom: bottomPad }}
    >
      <Animated.View style={anim} className="w-full max-w-[22rem] items-center">
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          onPress={dismiss}
          className={cn(
            'min-h-12 w-auto max-w-full flex-row items-center rounded-xl px-5 py-3.5',
            destructive ? 'bg-destructive' : 'bg-ink',
          )}
          style={
            Platform.OS === 'web'
              ? { boxShadow: `0 8px 24px ${colors.ink}33` }
              : {
                  shadowColor: colors.ink,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.22,
                  shadowRadius: 12,
                  elevation: 8,
                }
          }
        >
          <Text
            className={cn(
              'text-center font-sans-medium text-[14px] leading-5',
              destructive ? 'text-card' : 'text-paper',
            )}
          >
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
