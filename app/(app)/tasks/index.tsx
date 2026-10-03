import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
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

import {
  completeTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { taskStatusLabel } from '@/features/tasks/services/task-status';
import { errorMessageForUi } from '@/lib/api-error';

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('open');

  const tasks = useQuery({
    queryKey: ['tasks', filter, query],
    queryFn: () =>
      listTasks({
        status: filter === 'all' ? undefined : filter,
        query,
      }),
  });

  const toggleComplete = useMutation({
    mutationFn: async (task: TaskRow) => {
      if (task.status === 'completed') return reopenTask(task.id);
      return completeTask(task.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search tasks"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.filters}>
        {(['open', 'completed', 'all'] as const).map((key) => (
          <Pressable
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text
              style={[
                styles.chipText,
                filter === key && styles.chipTextActive,
              ]}
            >
              {key === 'all' ? 'All' : taskStatusLabel(key)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tasks.isLoading ? (
        <ActivityIndicator />
      ) : tasks.isError ? (
        <Text style={styles.error}>
          {errorMessageForUi(tasks.error, 'Failed to load tasks')}
        </Text>
      ) : (
        <FlatList
          data={tasks.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.meta}>
              No tasks yet. Approve suggestions from a note.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.check}
                disabled={toggleComplete.isPending}
                onPress={() => toggleComplete.mutate(item)}
              >
                <Text style={styles.checkMark}>
                  {item.status === 'completed' ? '✓' : '○'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.rowBody}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/tasks/[taskId]',
                    params: { taskId: item.id },
                  })
                }
              >
                <Text
                  style={[
                    styles.rowTitle,
                    item.status === 'completed' && styles.rowTitleDone,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {taskStatusLabel(item.status)}
                  {item.due_at
                    ? ` · due ${new Date(item.due_at).toLocaleDateString()}`
                    : ''}
                </Text>
                {item.source_note_id ? (
                  <Link
                    href={{
                      pathname: '/(app)/notes/[noteId]',
                      params: { noteId: item.source_note_id },
                    }}
                    style={styles.noteLink}
                  >
                    Source note
                  </Link>
                ) : null}
              </Pressable>
            </View>
          )}
        />
      )}

      {toggleComplete.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(toggleComplete.error, 'Update failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: '#f7f7f5' },
  search: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  filters: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipActive: { backgroundColor: '#1f4b3a', borderColor: '#1f4b3a' },
  chipText: { color: '#555', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  meta: { color: '#555' },
  error: { color: '#7a2e0b' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    gap: 10,
  },
  check: { paddingTop: 2, paddingHorizontal: 4 },
  checkMark: { fontSize: 20, color: '#1f4b3a' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '600', fontSize: 16, color: '#14241c' },
  rowTitleDone: { textDecorationLine: 'line-through', color: '#777' },
  noteLink: { color: '#1f4b3a', marginTop: 4, fontSize: 13 },
});
