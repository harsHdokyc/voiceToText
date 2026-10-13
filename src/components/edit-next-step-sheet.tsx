import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { colors, fonts, space } from '@/theme';

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
 * Shared edit dialog — title, due presets, reminder hour presets (prototype structure).
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
      <Text style={styles.label}>Title</Text>
      <TextField
        value={title}
        onChangeText={setTitle}
        editable={!busy}
        placeholder="Next step"
      />

      <Text style={styles.label}>Due date</Text>
      <View style={styles.chips}>
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
            <Text style={styles.clearLabel}>Clear</Text>
          </Button>
        ) : null}
      </View>
      {dueKey ? (
        <Text style={styles.dueHint}>{dueKey}</Text>
      ) : (
        <Text style={styles.dueHint}>No due date · Anytime</Text>
      )}

      <Text style={styles.label}>Reminder</Text>
      <View style={styles.chips}>
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
                size={12}
                color={active ? colors.paper : colors.ink}
              />
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                ]}
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
            <Text style={styles.clearLabel}>Clear</Text>
          </Button>
        ) : null}
      </View>
      <Text style={styles.dueHint}>
        Reminders use durable push scheduling (1h / 3h / 1d).
      </Text>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button
        variant="cta"
        size="lg"
        disabled={busy || !title.trim()}
        onPress={submit}
        style={styles.submit}
      >
        <Text style={styles.submitLabel}>{submitLabel}</Text>
        <Ionicons name="checkmark" size={16} color={colors.card} />
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    marginTop: space[2],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink,
  },
  chipTextActive: { color: colors.paper },
  clearLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.ink,
  },
  dueHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.stone,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  submit: { marginTop: space[3] },
  submitLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.card,
  },
});
