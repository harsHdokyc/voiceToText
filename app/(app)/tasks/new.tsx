import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createManualTask } from '@/features/tasks/services/tasks-service';
import { type TaskPriority } from '@/features/tasks/services/task-status';
import { errorMessageForUi } from '@/lib/api-error';

export default function NewTaskScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [dueLocal, setDueLocal] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createManualTask({
        title,
        details,
        priority,
        due_at: dueLocal.trim()
          ? new Date(`${dueLocal.trim()}T12:00:00.000Z`).toISOString()
          : null,
      }),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.replace({
        pathname: '/(app)/tasks/[taskId]',
        params: { taskId: task.id },
      });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        editable={!create.isPending}
      />
      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={details}
        onChangeText={setDetails}
        editable={!create.isPending}
        multiline
      />
      <Text style={styles.label}>Due (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={dueLocal}
        onChangeText={setDueLocal}
        editable={!create.isPending}
        autoCapitalize="none"
      />
      <Text style={styles.label}>Priority</Text>
      <View style={styles.filters}>
        {([null, 'low', 'normal', 'high'] as const).map((key) => (
          <Pressable
            key={key ?? 'none'}
            style={[styles.chip, priority === key && styles.chipActive]}
            disabled={create.isPending}
            onPress={() => setPriority(key)}
          >
            <Text
              style={[
                styles.chipText,
                priority === key && styles.chipTextActive,
              ]}
            >
              {key ?? 'none'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={styles.button}
        disabled={create.isPending}
        onPress={() => create.mutate()}
      >
        <Text style={styles.buttonText}>
          {create.isPending ? 'Creating…' : 'Create task'}
        </Text>
      </Pressable>
      {create.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(create.error, 'Create failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: '#f7f7f5' },
  label: { fontSize: 12, fontWeight: '600', color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  button: {
    marginTop: 8,
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#7a2e0b' },
});
