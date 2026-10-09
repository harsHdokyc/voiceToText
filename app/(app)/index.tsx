import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listNotes } from '@/features/notes/services/notes-service';
import { noteStatusLabel } from '@/features/notes/services/note-status';
import { signOut } from '@/features/auth/services/auth-service';
import { useAuth } from '@/providers/auth-provider';
import { errorMessageForUi } from '@/lib/api-error';

export default function HomeScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const notes = useQuery({
    queryKey: ['notes', query],
    queryFn: () => listNotes({ query }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice-to-Work</Text>
      <Text style={styles.meta}>{user?.email}</Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/(app)/record')}
      >
        <Text style={styles.buttonText}>Record a note</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => router.push('/(app)/tasks' as Href)}
      >
        <Text style={styles.buttonText}>My tasks</Text>
      </Pressable>

      <TextInput
        style={styles.search}
        placeholder="Search notes"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {notes.isLoading ? (
        <ActivityIndicator />
      ) : notes.isError ? (
        <Text style={styles.error}>
          {errorMessageForUi(notes.error, 'Failed to load')}
        </Text>
      ) : (
        <FlatList
          data={notes.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.meta}>
              {query.trim()
                ? 'No matching notes.'
                : 'No notes yet. Record your first thought.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/(app)/notes/[noteId]',
                  params: { noteId: item.id },
                })
              }
            >
              <Text style={styles.rowTitle}>
                {item.title ?? 'Voice note'}
              </Text>
              <Text style={styles.meta}>{noteStatusLabel(item.status)}</Text>
            </Pressable>
          )}
        />
      )}

      <Link href="/(app)/settings" style={styles.link}>
        Settings
      </Link>
      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => void signOut()}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: '#f7f7f5' },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { color: '#555' },
  error: { color: '#7a2e0b' },
  search: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#5a5a5a' },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowTitle: { fontWeight: '600', marginBottom: 4 },
  link: { color: '#1f4b3a', textAlign: 'center', paddingVertical: 8 },
});
