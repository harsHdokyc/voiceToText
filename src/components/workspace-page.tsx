/**
 * Shared dashboard page chrome — same gutters as ui/goals-in-motion-55 Workspace.
 */
import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, space, workspacePageContentStyle } from '@/theme';

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
  keyboardShouldPersistTaps = 'handled',
}: {
  children: ReactNode;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}) {
  const desktop = useWorkspaceDesktop();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        workspacePageContentStyle(desktop, { gap }),
        contentStyle,
      ]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
});
