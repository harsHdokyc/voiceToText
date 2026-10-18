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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paper,
        }}
      >
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
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="notes/index" />
        <Stack.Screen
          name="notes/[noteId]"
          options={{ ...detailHeader, title: 'Note' }}
        />
        <Stack.Screen name="suggestions" />
        <Stack.Screen name="tasks/index" />
        <Stack.Screen
          name="tasks/new"
          options={{ ...detailHeader, title: 'New task' }}
        />
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
