import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/providers/app-providers';
import { colors, useSaydoFonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already prevented or unavailable in tests */
});

export default function RootLayout() {
  const { loaded, error } = useSaydoFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </AppProviders>
  );
}
