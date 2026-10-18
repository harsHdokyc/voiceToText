/**
 * Saydo design principles — single source for colors, type, space, radius, fonts.
 * Hex from prototype oklch in ui/goals-in-motion-55/src/styles.css.
 */
import { useFonts } from 'expo-font';
import {
  Geist_400Regular,
  Geist_400Regular_Italic,
  Geist_500Medium,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from '@expo-google-fonts/geist-mono';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from '@expo-google-fonts/space-grotesk';

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

export function useSaydoFonts() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_400Regular_Italic,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  return { loaded, error };
}

export type ColorName = keyof typeof colors;
