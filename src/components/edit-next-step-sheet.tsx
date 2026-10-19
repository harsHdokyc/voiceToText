import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button, Sheet, TextField } from '@/components/ui';
import {
  DUE_PRESETS,
  dueAtFromLocalDateKey,
  dueDateKeyForPreset,
  localDateKeyFromDueAt,
  type DuePreset,
} from '@/features/tasks/services/due-presets';
import {
  REMINDER_HOUR_PRESETS,
  type ReminderHourPreset,
} from '@/features/reminders/services/reminder-schedule';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

export type EditNextStepDraft = {
  title: string;
  dueAt: string | null;
  reminderHours: ReminderHourPreset | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDueAt: string | null;
  /** Tasks: Save changes. Suggestions: Approve with changes (RLS blocks draft field updates). */
  mode: 'task' | 'suggestion';
  busy?: boolean;
  error?: string | null;
  onSave: (draft: EditNextStepDraft) => void;
};

/**
 * Shared edit dialog — mirrors ui/goals-in-motion-55 Workspace edit Dialog.
 * Reminder presets stay 1h/3h/1d (durable push); no demo datetime-local.
 */
export function EditNextStepSheet({
  open,
  onClose,
  initialTitle,
  initialDueAt,
  mode,
  busy,
  error,
  onSave,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [dueKey, setDueKey] = useState<string | null>(
    localDateKeyFromDueAt(initialDueAt),
  );
  const [reminderHours, setReminderHours] =
    useState<ReminderHourPreset | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDueKey(localDateKeyFromDueAt(initialDueAt));
    setReminderHours(null);
  }, [open, initialTitle, initialDueAt]);

  function applyPreset(preset: DuePreset) {
    setDueKey(dueDateKeyForPreset(preset));
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    let dueAt: string | null = null;
    if (dueKey) {
      try {
        dueAt = dueAtFromLocalDateKey(dueKey);
      } catch {
        return;
      }
    }
    onSave({ title: trimmed, dueAt, reminderHours });
  }

  const submitLabel =
    mode === 'suggestion'
      ? busy
        ? 'Approving…'
        : 'Approve with changes'
      : busy
        ? 'Saving…'
        : 'Save changes';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit your next step"
      description={
        mode === 'suggestion'
          ? 'Adjust the title and due date, then approve — suggestions become tasks only when you approve.'
          : 'Set a due date and a reminder so it doesn’t slip.'
      }
    >
      <View className="gap-2">
        <Text className="font-sans text-sm text-ink">Title</Text>
        <TextField
          value={title}
          onChangeText={setTitle}
          editable={!busy}
          placeholder="Next step"
          className="rounded-[14px] bg-card"
        />
      </View>

      <View className="gap-2">
        <Text className="font-sans text-sm text-ink">Due date</Text>
        <View className="flex-row flex-wrap gap-2">
          {DUE_PRESETS.map((p) => {
            const key = dueDateKeyForPreset(p.id);
            const active = dueKey === key;
            return (
              <Button
                key={p.id}
                size="sm"
                variant={active ? 'ink' : 'quiet'}
                disabled={busy}
                onPress={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            );
          })}
          {dueKey ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onPress={() => setDueKey(null)}
              accessibilityLabel="Clear due date"
            >
              <Ionicons name="close" size={14} color={colors.ink} />
              <Text className="font-sans text-xs text-ink">Clear</Text>
            </Button>
          ) : null}
        </View>
        <View className="relative justify-center">
          <TextField
            value={dueKey ?? ''}
            onChangeText={(t) => setDueKey(t.trim() || null)}
            editable={!busy}
            placeholder="YYYY-MM-DD"
            accessibilityLabel="Due date"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-[14px] bg-card pr-10"
            {...(Platform.OS === 'web'
              ? ({ type: 'date' } as object)
              : null)}
          />
          <View className="pointer-events-none absolute right-4">
            <Ionicons name="calendar-outline" size={18} color={colors.stone} />
          </View>
        </View>
        {!dueKey ? (
          <Text className="font-sans text-xs text-stone">No due date · Anytime</Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="font-sans text-sm text-ink">Reminder</Text>
        <View className="flex-row flex-wrap gap-2">
          {REMINDER_HOUR_PRESETS.map((p) => {
            const active = reminderHours === p.hours;
            return (
              <Button
                key={p.hours}
                size="sm"
                variant={active ? 'ink' : 'quiet'}
                disabled={busy}
                onPress={() =>
                  setReminderHours(active ? null : p.hours)
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={14}
                  color={active ? colors.paper : colors.ink}
                />
                <Text
                  className={cn(
                    'font-sans-medium text-xs',
                    active ? 'text-paper' : 'text-ink',
                  )}
                >
                  {p.label}
                </Text>
              </Button>
            );
          })}
          {reminderHours ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onPress={() => setReminderHours(null)}
              accessibilityLabel="Clear reminder"
            >
              <Ionicons name="close" size={14} color={colors.ink} />
              <Text className="font-sans text-xs text-ink">Clear</Text>
            </Button>
          ) : null}
        </View>
        <Text className="font-sans text-xs text-stone">
          Reminders use durable push scheduling (1h / 3h / 1d).
        </Text>
      </View>

      {error ? (
        <Text className="font-sans text-sm text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button
        variant="cta"
        size="lg"
        disabled={busy || !title.trim()}
        onPress={submit}
        className="mt-2 self-start rounded-pill px-6"
      >
        <Text className="font-sans-medium text-[15px] text-card">{submitLabel}</Text>
        <Ionicons name="checkmark" size={16} color={colors.card} />
      </Button>
    </Sheet>
  );
}
