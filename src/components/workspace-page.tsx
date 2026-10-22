/**
 * Shared dashboard page chrome — same gutters as ui/goals-in-motion-55 Workspace.
 */
import { Children, isValidElement, type ReactNode, useEffect } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { layout, space, workspacePageContentClassName } from '@/theme';

/** Ease-out cubic — gentle start, unhurried settle (no snap). */
const REVEAL_EASE = Easing.bezier(0.33, 1, 0.68, 1);
const REVEAL_MS = 850;
const REVEAL_RISE = 18;
const STAGGER_MS = 90;
/** Late sections share the last delay so long pages don't feel slow. */
const MAX_STAGGER_STEPS = 5;

/**
 * Opacity + translate only (never layout). Starts hidden on the first frame,
 * so there's no post-paint flash.
 */
function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(
      Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS,
      withTiming(1, { duration: REVEAL_MS, easing: REVEAL_EASE }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only reveal
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * REVEAL_RISE }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function useWorkspaceDesktop() {
  const { width } = useWindowDimensions();
  return width >= layout.desktopMin;
}

export function useWorkspaceWide() {
  const { width } = useWindowDimensions();
  return width >= layout.wideMin;
}

/**
 * Scrollable page body with prototype max-width + responsive padding.
 * Top-level sections rise in with a short stagger on mount (system reduced motion skips it).
 */
export function WorkspacePage({
  children,
  gap = space[4],
  contentStyle,
  contentClassName,
  keyboardShouldPersistTaps = 'handled',
}: {
  children: ReactNode;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  contentClassName?: string;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}) {
  const desktop = useWorkspaceDesktop();
  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerClassName={cn(
        workspacePageContentClassName(desktop),
        contentClassName,
      )}
      contentContainerStyle={[{ gap }, contentStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {Children.toArray(children).map((child, index) => (
        <Reveal key={isValidElement(child) ? child.key : index} index={index}>
          {child}
        </Reveal>
      ))}
    </ScrollView>
  );
}
