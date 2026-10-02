import { useMutation } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const health = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health');
      if (error) throw error;
      return data;
    },
  });

  const spike = useMutation({
    mutationFn: async (probe: 'config' | 'chat') => {
      const { data, error } = await supabase.functions.invoke('openai-spike', {
        body: { probe },
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings / debug</Text>
      <Pressable style={styles.button} onPress={() => health.mutate()}>
        <Text style={styles.buttonText}>health</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => spike.mutate('config')}>
        <Text style={styles.buttonText}>openai-spike config</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => spike.mutate('chat')}>
        <Text style={styles.buttonText}>openai-spike chat</Text>
      </Pressable>
      {health.data ? <Text>{JSON.stringify(health.data)}</Text> : null}
      {spike.data ? <Text>{JSON.stringify(spike.data)}</Text> : null}
      {health.error || spike.error ? (
        <Text style={styles.error}>
          {(health.error ?? spike.error) instanceof Error
            ? (health.error ?? spike.error)!.message
            : 'Request failed'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: '#f7f7f5' },
  title: { fontSize: 22, fontWeight: '700' },
  button: {
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#7a2e0b' },
});
