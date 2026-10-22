import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts } from '@/theme';

const detailHeader = {
  headerShown: true as const,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.cobalt,
  headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
};

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <WorkspaceShell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          // Content reveal lives in WorkspacePage; a slide here would double the motion.
          animation: 'fade',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="notes/index" />
        {/* Prototype detail lives inside WorkspacePage chrome — no Stack title bar */}
        <Stack.Screen name="notes/[noteId]" options={{ headerShown: false }} />
        <Stack.Screen name="suggestions" />
        <Stack.Screen name="tasks/index" />
        <Stack.Screen
          name="tasks/[taskId]"
          options={{ ...detailHeader, title: 'Task' }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen name="record" options={{ headerShown: false }} />
      </Stack>
    </WorkspaceShell>
  );
}
