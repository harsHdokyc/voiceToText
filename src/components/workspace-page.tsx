/**
 * Shared dashboard page chrome — same gutters as ui/goals-in-motion-55 Workspace.
 */
import { Children, isValidElement, type ReactNode } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { layout, space, workspacePageContentClassName } from '@/theme';

/** Same ease-out as the sidenav pill — long, soft settle. */
const REVEAL_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const REVEAL_MS = 560;
const STAGGER_MS = 55;
/** Late sections share the last delay so long pages don't feel slow. */
const MAX_STAGGER_STEPS = 5;

function revealAt(index: number) {
  return FadeInDown.duration(REVEAL_MS)
    .delay(Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS)
    .easing(REVEAL_EASE)
    .withInitialValues({ transform: [{ translateY: 14 }] });
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
        <Animated.View
          key={isValidElement(child) ? child.key : index}
          entering={revealAt(index)}
        >
          {child}
        </Animated.View>
      ))}
    </ScrollView>
  );
}
