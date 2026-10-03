import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  completeTask,
  getTask,
  reopenTask,
  updateTask,
} from '@/features/tasks/services/tasks-service';
import {
  taskStatusLabel,
  type TaskPriority,
} from '@/features/tasks/services/task-status';
import {
  cancelReminder,
  listRemindersForTask,
  scheduleReminder,
} from '@/features/reminders/services/reminders-service';
import { reminderAtHoursFromNow } from '@/features/reminders/services/reminder-schedule';
import { registerForPushNotifications } from '@/features/reminders/services/push-registration';
import { errorMessageForUi } from '@/lib/api-error';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const queryClient = useQueryClient();

  const task = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => getTask(taskId),
    enabled: Boolean(taskId),
  });

  const reminders = useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => listRemindersForTask(taskId),
    enabled: Boolean(taskId),
  });

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<TaskPriority | null>(null);

  useEffect(() => {
    if (!task.data) return;
    setTitle(task.data.title);
    setDetails(task.data.details ?? '');
    setPriority(task.data.priority);
  }, [task.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!task.data) throw new Error('Task missing');
      return updateTask(task.data.id, {
        title,
        details,
        due_at: task.data.due_at,
        priority,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!task.data) throw new Error('Task missing');
      if (task.data.status === 'completed') return reopenTask(task.data.id);
      return completeTask(task.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });

  const remind = useMutation({
    mutationFn: async (hours: number) => {
      if (!task.data) throw new Error('Task missing');
      await registerForPushNotifications().catch(() => undefined);
      return scheduleReminder({
        taskId: task.data.id,
        scheduledFor: reminderAtHoursFromNow(hours),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', taskId] });
    },
  });

  const cancelRemind = useMutation({
    mutationFn: (reminderId: string) => cancelReminder(reminderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', taskId] });
    },
  });

  if (task.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (task.isError || !task.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {errorMessageForUi(task.error, 'Task not found')}
        </Text>
      </View>
    );
  }

  const row = task.data;
  const busy =
    save.isPending ||
    toggle.isPending ||
    remind.isPending ||
    cancelRemind.isPending;
  const editable = row.status !== 'archived';
  const scheduled = (reminders.data ?? []).filter((r) => r.status === 'scheduled');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>Status: {taskStatusLabel(row.status)}</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        editable={editable && !busy}
      />

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={details}
        onChangeText={setDetails}
        editable={editable && !busy}
        multiline
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.filters}>
        {([null, 'low', 'normal', 'high'] as const).map((key) => (
          <Pressable
            key={key ?? 'none'}
            style={[styles.chip, priority === key && styles.chipActive]}
            disabled={!editable || busy}
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

      {row.due_at ? (
        <Text style={styles.meta}>
          Due: {new Date(row.due_at).toLocaleString()}
        </Text>
      ) : null}

      {row.source_note_id ? (
        <Link
          href={{
            pathname: '/(app)/notes/[noteId]',
            params: { noteId: row.source_note_id },
          }}
          style={styles.noteLink}
        >
          Open source note
        </Link>
      ) : (
        <Text style={styles.meta}>No source note linked.</Text>
      )}

      {editable && row.status === 'open' ? (
        <>
          <Text style={styles.label}>Remind me</Text>
          <View style={styles.filters}>
            {([1, 3, 24] as const).map((hours) => (
              <Pressable
                key={hours}
                style={styles.chip}
                disabled={busy}
                onPress={() => remind.mutate(hours)}
              >
                <Text style={styles.chipText}>
                  {hours === 24 ? '1 day' : `${hours}h`}
                </Text>
              </Pressable>
            ))}
          </View>
          {scheduled.map((r) => (
            <View key={r.id} style={styles.reminderRow}>
              <Text style={styles.meta}>
                Scheduled {new Date(r.scheduled_for).toLocaleString()}
              </Text>
              <Pressable
                disabled={busy}
                onPress={() => cancelRemind.mutate(r.id)}
              >
                <Text style={styles.noteLink}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}

      {editable ? (
        <>
          <Pressable
            style={styles.button}
            disabled={busy}
            onPress={() => save.mutate()}
          >
            <Text style={styles.buttonText}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondary]}
            disabled={busy}
            onPress={() => toggle.mutate()}
          >
            <Text style={styles.buttonText}>
              {row.status === 'completed' ? 'Reopen task' : 'Mark complete'}
            </Text>
          </Pressable>
        </>
      ) : null}

      {save.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(save.error, 'Save failed')}
        </Text>
      ) : null}
      {toggle.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(toggle.error, 'Update failed')}
        </Text>
      ) : null}
      {remind.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(remind.error, 'Reminder failed')}
        </Text>
      ) : null}
      {cancelRemind.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(cancelRemind.error, 'Cancel failed')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 24, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { color: '#555' },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#14241c',
    backgroundColor: '#fff',
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
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
  noteLink: { color: '#1f4b3a', fontWeight: '600', paddingVertical: 4 },
  button: {
    marginTop: 8,
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#5a5a5a' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#7a2e0b' },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
