/**
 * Shared dashboard page chrome — same gutters as ui/goals-in-motion-55 Workspace.
 */
import { type ReactNode } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { cn } from '@/lib/cn';
import { layout, space, workspacePageContentClassName } from '@/theme';

export function useWorkspaceDesktop() {
  const { width } = useWindowDimensions();
  return width >= layout.desktopMin;
}

export function useWorkspaceWide() {
  const { width } = useWindowDimensions();
  return width >= layout.wideMin;
}

/** Scrollable page body with prototype max-width + responsive padding. */
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
      {children}
    </ScrollView>
  );
}
