import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f7f7f5' },
        headerTintColor: '#1f4b3a',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Notes' }} />
      <Stack.Screen name="record" options={{ title: 'Record' }} />
      <Stack.Screen name="notes/[noteId]" options={{ title: 'Note' }} />
      <Stack.Screen name="tasks/index" options={{ title: 'Tasks' }} />
      <Stack.Screen name="tasks/[taskId]" options={{ title: 'Task' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
