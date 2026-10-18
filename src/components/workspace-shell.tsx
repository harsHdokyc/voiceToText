import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureProvider, useCapture } from '@/components/capture-sheet';
import { PageEnter } from '@/components/page-enter';
import { Button } from '@/components/ui';
import {
  hrefForWorkspaceNav,
  WORKSPACE_NAV,
  workspaceSectionFromPath,
  type WorkspaceNavItem,
} from '@/components/workspace-nav';
import { countPendingSuggestions } from '@/features/notes/services/suggestions-service';
import { greetingName } from '@/features/settings/services/greeting-name';
import { getOwnProfile } from '@/features/settings/services/profile-service';
import { APP_NAME } from '@/lib/constants';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radius, space } from '@/theme';

const DESKTOP_MIN = 768;

const NAV_ICONS: Record<
  WorkspaceNavItem,
  keyof typeof Ionicons.glyphMap
> = {
  Overview: 'grid-outline',
  'Voice notes': 'mic-outline',
  Suggestions: 'sparkles-outline',
  Tasks: 'checkbox-outline',
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <CaptureProvider>
      <WorkspaceShellInner>{children}</WorkspaceShellInner>
    </CaptureProvider>
  );
}

function WorkspaceShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = workspaceSectionFromPath(pathname);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= DESKTOP_MIN;
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { openCapture } = useCapture();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: getOwnProfile,
    staleTime: 60_000,
  });
  const display = greetingName(
    profile.data?.display_name ??
      (user?.user_metadata?.display_name as string | undefined),
    user?.email,
  );
  const initial = display.charAt(0).toUpperCase();

  const pending = useQuery({
    queryKey: ['suggestions', 'pending-count'],
    queryFn: countPendingSuggestions,
    staleTime: 15_000,
  });
  const pendingCount = pending.data ?? 0;

  const go = (item: WorkspaceNavItem) => {
    router.push(hrefForWorkspaceNav(item) as Href);
  };

  return (
    <View style={[styles.root, { paddingTop: desktop ? 0 : insets.top }]}>
      {desktop ? (
        <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
          <View style={styles.brandRow}>
            {collapsed ? (
              <Ionicons name="musical-notes" size={22} color={colors.lime} />
            ) : (
              <Text style={styles.wordmark}>{APP_NAME}</Text>
            )}
          </View>
          <Button
            variant="lime"
            size="lg"
            onPress={openCapture}
            accessibilityLabel="New voice note"
            style={collapsed ? styles.sidebarIconBtn : styles.sidebarCta}
          >
            {collapsed ? (
              <Ionicons name="add" size={22} color={colors.ink} />
            ) : (
              <Text style={styles.limeLabel}>
                <Ionicons name="add" size={18} color={colors.ink} /> New voice
                note
              </Text>
            )}
          </Button>
          <View style={styles.navBlock}>
            {WORKSPACE_NAV.map((item) => {
              const active = section === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => go(item)}
                  style={[
                    styles.navItem,
                    collapsed && styles.navItemCollapsed,
                    active && styles.navItemActive,
                  ]}
                >
                  <Ionicons
                    name={NAV_ICONS[item]}
                    size={20}
                    color={active ? colors.lime : colors.stone}
                  />
                  {!collapsed ? (
                    <>
                      <Text
                        style={[
                          styles.navLabel,
                          active && styles.navLabelActive,
                        ]}
                      >
                        {item}
                      </Text>
                      {item === 'Suggestions' ? (
                        <Text style={styles.badge}>{pendingCount}</Text>
                      ) : null}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sidebarFooter}>
            <Pressable
              onPress={() => router.push('/(app)/settings' as Href)}
              style={[
                styles.navItem,
                collapsed && styles.navItemCollapsed,
                section === 'Settings' && styles.navItemActive,
              ]}
              accessibilityLabel="Settings"
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={
                  section === 'Settings' ? colors.lime : colors.stone
                }
              />
              {!collapsed ? (
                <Text
                  style={[
                    styles.navLabel,
                    section === 'Settings' && styles.navLabelActive,
                  ]}
                >
                  Settings
                </Text>
              ) : null}
            </Pressable>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              {!collapsed ? (
                <Text style={styles.avatarName} numberOfLines={1}>
                  {display}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={[styles.header, { paddingTop: desktop ? 0 : 0 }]}>
          <View style={styles.headerLeft}>
            {desktop ? (
              <Pressable
                accessibilityLabel={
                  collapsed ? 'Expand navigation' : 'Collapse navigation'
                }
                onPress={() => setCollapsed((c) => !c)}
                hitSlop={12}
                style={styles.collapseBtn}
              >
                <Ionicons
                  name={collapsed ? 'menu' : 'menu-outline'}
                  size={22}
                  color={colors.ink}
                />
              </Pressable>
            ) : null}
            <Text style={styles.crumb} numberOfLines={1}>
              Workspace{' '}
              <Text style={styles.crumbSep}>/</Text>{' '}
              <Text style={styles.crumbCurrent}>{section}</Text>
            </Text>
          </View>
          <Button
            variant="cta"
            size="md"
            onPress={openCapture}
            accessibilityLabel="Capture a thought"
          >
            <Ionicons name="mic" size={18} color={colors.card} />
            {desktop || width > 400 ? (
              <Text style={styles.ctaLabel}>Capture a thought</Text>
            ) : null}
          </Button>
        </View>

        <View
          style={[
            styles.content,
            !desktop && { paddingBottom: 72 + insets.bottom },
          ]}
        >
          <PageEnter animKey={pathname}>{children}</PageEnter>
          {!desktop ? (
            <Pressable
              onPress={() => router.push('/(app)/settings' as Href)}
              style={styles.mobileSettings}
              accessibilityLabel="Settings"
              hitSlop={12}
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color={colors.cobalt}
              />
              <Text style={styles.mobileSettingsText}>Settings</Text>
            </Pressable>
          ) : null}
        </View>

        {!desktop ? (
          <View
            style={[
              styles.bottomNav,
              { paddingBottom: Math.max(insets.bottom, space[2]) },
            ]}
          >
            {WORKSPACE_NAV.map((item) => {
              const active = section === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => go(item)}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={NAV_ICONS[item]}
                    size={20}
                    color={active ? colors.cobalt : colors.stone}
                  />
                  <Text
                    style={[styles.tabLabel, active && styles.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {item === 'Voice notes' ? 'Notes' : item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.paper },
  sidebar: {
    width: 240,
    backgroundColor: colors.ink,
    padding: space[4],
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  sidebarCollapsed: { width: 80, alignItems: 'center' },
  brandRow: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: space[2],
  },
  wordmark: {
    fontFamily: fonts.displaySemibold,
    fontSize: 24,
    color: colors.paper,
  },
  sidebarCta: { marginTop: space[6], alignSelf: 'stretch' },
  sidebarIconBtn: { marginTop: space[6], width: 48, alignSelf: 'center' },
  limeLabel: {
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    fontSize: 14,
  },
  navBlock: { marginTop: space[8], gap: space[2], flex: 1 },
  navItem: {
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 48, alignSelf: 'center' },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  navLabel: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
  },
  navLabelActive: { color: colors.lime },
  badge: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.lime,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: space[4],
    gap: space[3],
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[2],
    paddingTop: space[2],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink,
  },
  avatarName: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.paper,
  },
  main: { flex: 1, minWidth: 0 },
  header: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: space[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    backgroundColor: colors.paper,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minWidth: 0,
  },
  collapseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crumb: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.stone,
    flexShrink: 1,
  },
  crumbSep: { color: 'rgba(23,23,23,0.3)' },
  crumbCurrent: { color: colors.ink },
  ctaLabel: {
    fontFamily: fonts.sansMedium,
    color: colors.card,
    fontSize: 14,
  },
  content: { flex: 1 },
  mobileSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[5],
    paddingVertical: space[3],
  },
  mobileSettingsText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.cobalt,
    textDecorationLine: 'underline',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  tab: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  tabActive: { backgroundColor: colors.lavender },
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.stone,
  },
  tabLabelActive: { color: colors.cobalt },
});
