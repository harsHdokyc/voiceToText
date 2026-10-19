/**
 * Saydo design principles — re-exports tokens + font loader.
 * Tokens live in theme-tokens.ts (pure; Vitest-safe).
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

export {
  colors,
  fonts,
  layout,
  radius,
  space,
  type,
  workspacePageContentClassName,
  workspacePageContentStyle,
  type ColorName,
} from '@/theme-tokens';

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
