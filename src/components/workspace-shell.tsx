import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureProvider, useCapture } from '@/components/capture-sheet';
import { Button, iconPressClassName } from '@/components/ui';
import {
  hrefForWorkspaceNav,
  WORKSPACE_NAV,
  WORKSPACE_NAV_ITEM_H,
  workspaceNavIndex,
  workspaceNavPillOffset,
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
  Settings: 'settings-outline',
};

/** Prototype `--ease-out`: cubic-bezier(0.22, 1, 0.36, 1). */
const NAV_PILL_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const NAV_PILL_MS = 420;

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
  const reducedMotion = useReducedMotion();
  const routeIndex = workspaceNavIndex(section);
  // Ref tracks intent so route sync doesn't reverse an in-flight click tween.
  const pillRef = useRef(routeIndex);
  const [pillIndex, setPillIndex] = useState(routeIndex);
  const pillY = useSharedValue(workspaceNavPillOffset(Math.max(routeIndex, 0)));
  const pillOpacity = useSharedValue(routeIndex >= 0 ? 1 : 0);
  const tween = { duration: NAV_PILL_MS, easing: NAV_PILL_EASE };

  const setPill = (index: number) => {
    pillRef.current = index;
    setPillIndex(index);
    const show = index >= 0;
    if (reducedMotion) {
      pillY.value = workspaceNavPillOffset(index);
      pillOpacity.value = show ? 1 : 0;
      return;
    }
    if (show) {
      pillOpacity.value = 1;
      pillY.value = withTiming(workspaceNavPillOffset(index), tween);
    } else {
      pillOpacity.value = withTiming(0, tween);
    }
  };

  useEffect(() => {
    if (routeIndex === pillRef.current) return;
    setPill(routeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- route sync only
  }, [routeIndex, reducedMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
    opacity: pillOpacity.value,
  }));

  const open = (index: number, href: Href) => {
    if (index !== pillRef.current) setPill(index);
    router.push(href);
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
          <View
            className={cn(
              'relative mt-4 flex-1',
              collapsed && 'w-12 self-center',
            )}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: WORKSPACE_NAV_ITEM_H,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                },
                pillStyle,
              ]}
            />
            {WORKSPACE_NAV.map((item, index) => {
              const active = pillIndex === index;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    open(index, hrefForWorkspaceNav(item) as Href)
                  }
                  className={cn(
                    'z-[1] h-11 w-full flex-row items-center gap-3 rounded-md px-3',
                    index < WORKSPACE_NAV.length - 1 && 'mb-2',
                    collapsed && 'justify-center px-0',
                    !active && 'hover:bg-white/10 active:bg-white/12',
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
                        className="flex-1 font-sans text-sm"
                        style={{
                          color: active ? colors.lime : colors.stone,
                        }}
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
          <View className="border-t border-white/12 pt-4">
            <View
              className={cn(
                'flex-row items-center gap-3 px-2',
                collapsed && 'justify-center px-0',
              )}
            >
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
                className={cn('h-10 w-10', iconPressClassName)}
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
          {children}
        </View>

        {!desktop ? (
          <View
            className="absolute bottom-0 left-0 right-0 flex-row border-t border-border bg-paper"
            style={{ paddingBottom: Math.max(insets.bottom, space[2]) }}
          >
            {WORKSPACE_NAV.map((item, index) => {
              const active = section === item;
              return (
                <Pressable
                  key={item}
                  onPress={() =>
                    open(index, hrefForWorkspaceNav(item) as Href)
                  }
                  accessibilityLabel={item}
                  className={cn(
                    'min-h-16 flex-1 items-center justify-center gap-1 px-0.5 web:transition-colors web:duration-200 hover:bg-lavender/60 active:bg-lavender',
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
