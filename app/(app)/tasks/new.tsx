import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, TextField } from '@/components/ui';
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
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerClassName="gap-2.5 p-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-sans-medium text-xs text-stone">Title</Text>
      <TextField
        value={title}
        onChangeText={setTitle}
        editable={!create.isPending}
      />
      <Text className="font-sans-medium text-xs text-stone">Details</Text>
      <TextField
        className="min-h-20 align-top"
        value={details}
        onChangeText={setDetails}
        editable={!create.isPending}
        multiline
        textAlignVertical="top"
      />
      <Text className="font-sans-medium text-xs text-stone">Due (YYYY-MM-DD)</Text>
      <TextField
        value={dueLocal}
        onChangeText={setDueLocal}
        editable={!create.isPending}
        autoCapitalize="none"
      />
      <Text className="font-sans-medium text-xs text-stone">Priority</Text>
      <View className="flex-row flex-wrap gap-2">
        {([null, 'low', 'normal', 'high'] as const).map((key) => (
          <Button
            key={key ?? 'none'}
            variant={priority === key ? 'ink' : 'quiet'}
            size="sm"
            disabled={create.isPending}
            onPress={() => setPriority(key)}
          >
            {key ?? 'none'}
          </Button>
        ))}
      </View>
      <Button
        variant="cta"
        className="mt-2"
        disabled={create.isPending}
        onPress={() => create.mutate()}
      >
        {create.isPending ? 'Creating…' : 'Create task'}
      </Button>
      {create.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(create.error, 'Create failed')}
        </Text>
      ) : null}
    </ScrollView>
  );
}
