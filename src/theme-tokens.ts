/**
 * Pure Saydo tokens (no expo/RN imports) — safe for Vitest.
 * Hex / spacing from ui/goals-in-motion-55 styles.css + Workspace.tsx.
 */

export const colors = {
  ink: '#171717',
  paper: '#f6f4ef',
  cobalt: '#535df2',
  cobaltDeep: '#3c3acf',
  lime: '#dfff5a',
  lavender: '#d8d6fb',
  stone: '#73726b',
  muted: '#e9e8e2',
  card: '#ffffff',
  destructive: '#db2c2b',
  border: 'rgba(23, 23, 23, 0.12)',
  input: 'rgba(23, 23, 23, 0.18)',
} as const;

/** expo-font family keys (must match useSaydoFonts map). */
export const fonts = {
  display: 'SpaceGrotesk_500Medium',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansItalic: 'Geist_400Regular_Italic',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export const type = {
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  display: { fontFamily: fonts.display, fontWeight: '500' as const },
  body: { fontFamily: fonts.sans },
} as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 } as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/**
 * Workspace shell / page rhythm — mirrors
 * `mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-10` + sticky header `px-5 md:px-10`.
 */
export const layout = {
  desktopMin: 768,
  wideMin: 1024,
  contentMaxWidth: 1280,
  pagePadX: space[5],
  pagePadY: space[6],
  pagePadXDesktop: space[10],
  pagePadYDesktop: space[10],
  headerHeight: 64,
  headerHeightDesktop: 80,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 80,
  /** Voice notes search column — `lg:grid-cols-[1fr_18rem]` */
  notesSearchWidth: 288,
} as const;

/**
 * Shared content inset classes for every dashboard screen.
 * Mirrors `mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-10`.
 */
export function workspacePageContentClassName(desktop: boolean) {
  return desktop
    ? 'w-full max-w-content self-center px-page-x-desktop pt-page-y-desktop pb-10'
    : 'w-full max-w-content self-center px-page-x pt-page-y pb-10';
}

/** Numeric gutters when a caller still needs StyleProp overrides. */
export function workspacePageContentStyle(
  desktop: boolean,
  extras?: {
    gap?: number;
    maxWidth?: number;
  },
) {
  return {
    width: '100%' as const,
    maxWidth: extras?.maxWidth ?? layout.contentMaxWidth,
    alignSelf: 'center' as const,
    paddingHorizontal: desktop ? layout.pagePadXDesktop : layout.pagePadX,
    paddingTop: desktop ? layout.pagePadYDesktop : layout.pagePadY,
    paddingBottom: space[10],
    ...(extras?.gap != null ? { gap: extras.gap } : null),
  };
}

export type ColorName = keyof typeof colors;
