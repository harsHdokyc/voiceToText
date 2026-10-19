import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
  Pressable,
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
import { SaydoWordmark } from '@/components/saydo-mark';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { colors, layout, space } from '@/theme';

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
  const desktop = width >= layout.desktopMin;
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
    <View
      className="flex-1 flex-row bg-paper"
      style={{ paddingTop: desktop ? 0 : insets.top }}
    >
      {desktop ? (
        <View
          className={cn(
            'border-r border-white/12 bg-ink p-4',
            collapsed
              ? 'w-sidebar-collapsed items-center'
              : 'w-sidebar',
          )}
        >
          <View
            className={cn(
              'h-14 justify-center',
              collapsed ? 'items-center px-0' : 'items-start px-2',
            )}
          >
            <SaydoWordmark
              markSize={collapsed ? 32 : 34}
              showName={!collapsed}
              color={colors.paper}
              nameClassName="font-display-semibold text-2xl text-paper"
            />
          </View>
          <Button
            variant="lime"
            size="lg"
            onPress={openCapture}
            accessibilityLabel="New voice note"
            className={
              collapsed
                ? 'mt-6 w-12 self-center'
                : 'mt-6 self-stretch'
            }
          >
            {collapsed ? (
              <Ionicons name="add" size={22} color={colors.ink} />
            ) : (
              <Text className="font-sans-medium text-sm text-ink">
                <Ionicons name="add" size={18} color={colors.ink} /> New voice
                note
              </Text>
            )}
          </Button>
          <View className="mt-8 flex-1 gap-2">
            {WORKSPACE_NAV.map((item) => {
              const active = section === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => go(item)}
                  className={cn(
                    'min-h-11 flex-row items-center gap-3 rounded-md px-3',
                    collapsed && 'w-12 justify-center self-center px-0',
                    active && 'bg-white/8',
                  )}
                >
                  <Ionicons
                    name={NAV_ICONS[item]}
                    size={20}
                    color={active ? colors.lime : colors.stone}
                  />
                  {!collapsed ? (
                    <>
                      <Text
                        className={cn(
                          'flex-1 font-sans text-sm text-stone',
                          active && 'text-lime',
                        )}
                      >
                        {item}
                      </Text>
                      {item === 'Suggestions' ? (
                        <Text className="font-mono text-[11px] text-lime">
                          {pendingCount}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View className="gap-3 border-t border-white/12 pt-4">
            <Pressable
              onPress={() => router.push('/(app)/settings' as Href)}
              className={cn(
                'min-h-11 flex-row items-center gap-3 rounded-md px-3',
                collapsed && 'w-12 justify-center self-center px-0',
                section === 'Settings' && 'bg-white/8',
              )}
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
                  className={cn(
                    'font-sans text-sm text-stone',
                    section === 'Settings' && 'text-lime',
                  )}
                >
                  Settings
                </Text>
              ) : null}
            </Pressable>
            <View className="flex-row items-center gap-3 px-2 pt-2">
              <View className="h-8 w-8 items-center justify-center rounded-pill bg-lavender">
                <Text className="font-sans-medium text-xs text-ink">
                  {initial}
                </Text>
              </View>
              {!collapsed ? (
                <Text
                  className="flex-1 font-sans text-[13px] text-paper"
                  numberOfLines={1}
                >
                  {display}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      <View className="min-w-0 flex-1">
        <View
          className={cn(
            'min-h-header flex-row items-center justify-between gap-3 border-b border-border bg-paper px-page-x',
            desktop && 'min-h-header-desktop px-page-x-desktop',
          )}
        >
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            {desktop ? (
              <Pressable
                accessibilityLabel={
                  collapsed ? 'Expand navigation' : 'Collapse navigation'
                }
                onPress={() => setCollapsed((c) => !c)}
                hitSlop={12}
                className="h-10 w-10 items-center justify-center"
              >
                <Ionicons
                  name={collapsed ? 'menu' : 'menu-outline'}
                  size={22}
                  color={colors.ink}
                />
              </Pressable>
            ) : null}
            <Text
              className="shrink font-sans text-[13px] text-stone"
              numberOfLines={1}
            >
              Workspace{' '}
              <Text className="text-ink/30">/</Text>{' '}
              <Text className="text-ink">{section}</Text>
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
              <Text className="font-sans-medium text-sm text-card">
                Capture a thought
              </Text>
            ) : null}
          </Button>
        </View>

        <View
          className="flex-1"
          style={!desktop ? { paddingBottom: 72 + insets.bottom } : undefined}
        >
          <PageEnter animKey={pathname}>{children}</PageEnter>
          {!desktop ? (
            <Pressable
              onPress={() => router.push('/(app)/settings' as Href)}
              className="flex-row items-center gap-2 px-page-x py-3"
              accessibilityLabel="Settings"
              hitSlop={12}
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color={colors.cobalt}
              />
              <Text className="font-sans text-sm text-cobalt underline">
                Settings
              </Text>
            </Pressable>
          ) : null}
        </View>

        {!desktop ? (
          <View
            className="absolute bottom-0 left-0 right-0 flex-row border-t border-border bg-paper"
            style={{ paddingBottom: Math.max(insets.bottom, space[2]) }}
          >
            {WORKSPACE_NAV.map((item) => {
              const active = section === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => go(item)}
                  className={cn(
                    'min-h-16 flex-1 items-center justify-center gap-1 px-0.5',
                    active && 'bg-lavender',
                  )}
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
                    className={cn(
                      'font-sans text-[10px] text-stone',
                      active && 'text-cobalt',
                    )}
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
