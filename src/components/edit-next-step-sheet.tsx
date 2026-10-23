import { Ionicons } from '@expo/vector-icons';
import { createElement, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button, Sheet, TextField } from '@/components/ui';
import {
  DUE_PRESETS,
  dueAtFromLocalDateKey,
  dueDateKeyForPreset,
  localDateKeyFromDueAt,
  localTimeKeyFromDueAt,
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
  /** Tasks: Save changes. Suggestions: Approve with changes (RLS blocks draft field updates). Create: new manual task. */
  mode: 'task' | 'suggestion' | 'create';
  busy?: boolean;
  error?: string | null;
  onSave: (draft: EditNextStepDraft) => void;
};

const MODE_COPY: Record<
  Props['mode'],
  { title: string; description: string; submitLabel: string; busyLabel: string }
> = {
  task: {
    title: 'Edit your next step',
    description: 'Set a due date and a reminder so it doesn’t slip.',
    submitLabel: 'Save changes',
    busyLabel: 'Saving…',
  },
  suggestion: {
    title: 'Edit your next step',
    description:
      'Adjust the title and due date, then approve — suggestions become tasks only when you approve.',
    submitLabel: 'Approve with changes',
    busyLabel: 'Approving…',
  },
  create: {
    title: 'New next step',
    description: 'Write it down, then set a due date and a reminder so it doesn’t slip.',
    submitLabel: 'Add task',
    busyLabel: 'Adding…',
  },
};

const WEB_INPUT_STYLE = {
  width: '100%',
  minHeight: 52,
  boxSizing: 'border-box',
  borderRadius: 14,
  border: `1px solid ${colors.input}`,
  background: colors.card,
  color: colors.ink,
  padding: '0 16px',
  fontSize: 16,
  fontFamily: 'Geist_400Regular, system-ui, sans-serif',
  cursor: 'pointer',
} as const;

/**
 * Date (`YYYY-MM-DD`) or time (`HH:mm`) input. Web gets the browser's native
 * picker — RN-web's TextInput forces `type="text"`, so it can't. Native has no
 * picker dependency yet, so it stays a typed field.
 */
function DueField({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: 'date' | 'time';
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  const label = kind === 'date' ? 'Due date' : 'Due time';
  if (Platform.OS === 'web') {
    return createElement('input', {
      type: kind,
      value: value ?? '',
      disabled,
      'aria-label': label,
      style: { ...WEB_INPUT_STYLE, opacity: disabled ? 0.5 : 1 },
      onChange: (e: { target: { value: string } }) =>
        onChange(e.target.value || null),
      // Open the picker from anywhere in the field, not just the tiny icon.
      onClick: (e: { currentTarget: { showPicker?: () => void } }) => {
        try {
          e.currentTarget.showPicker?.();
        } catch {
          // Not allowed in some browsers/iframes; typing still works.
        }
      },
    });
  }
  return (
    <TextField
      value={value ?? ''}
      onChangeText={(t) => onChange(t.trim() || null)}
      editable={!disabled}
      placeholder={kind === 'date' ? 'YYYY-MM-DD' : 'HH:mm (24h)'}
      accessibilityLabel={label}
      keyboardType="numbers-and-punctuation"
      autoCapitalize="none"
      autoCorrect={false}
      className="rounded-[14px] bg-card"
    />
  );
}

/**
 * Shared edit dialog — mirrors ui/goals-in-motion-55 Workspace edit Dialog.
 * Reminder presets stay 1h/3h/1d (durable push).
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
  const [timeKey, setTimeKey] = useState<string | null>(
    localTimeKeyFromDueAt(initialDueAt),
  );
  const [reminderHours, setReminderHours] =
    useState<ReminderHourPreset | null>(null);

  const draftFor = open ? `${initialTitle}\n${initialDueAt ?? ''}` : null;
  const [seededFor, setSeededFor] = useState(draftFor);
  if (draftFor !== seededFor) {
    setSeededFor(draftFor);
    if (draftFor !== null) {
      setTitle(initialTitle);
      setDueKey(localDateKeyFromDueAt(initialDueAt));
      setTimeKey(localTimeKeyFromDueAt(initialDueAt));
      setReminderHours(null);
    }
  }

  function applyPreset(preset: DuePreset) {
    setDueKey(dueDateKeyForPreset(preset));
  }

  function clearDue() {
    setDueKey(null);
    setTimeKey(null);
  }

  const dueAt = dueKey ? dueAtFromLocalDateKey(dueKey, timeKey) : null;
  const dueInvalid = dueKey !== null && dueAt === null;

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || busy || dueInvalid) return;
    onSave({ title: trimmed, dueAt, reminderHours });
  }

  const copy = MODE_COPY[mode];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
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
        <Text className="font-sans text-sm text-ink">Due date & time</Text>
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
              onPress={clearDue}
              accessibilityLabel="Clear due date"
            >
              <Ionicons name="close" size={14} color={colors.ink} />
              <Text className="font-sans text-xs text-ink">Clear</Text>
            </Button>
          ) : null}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <View className="min-w-[150px] flex-[3]">
            <DueField kind="date" value={dueKey} onChange={setDueKey} disabled={busy} />
          </View>
          <View className="min-w-[120px] flex-[2]">
            <DueField
              kind="time"
              value={timeKey}
              onChange={setTimeKey}
              disabled={busy || !dueKey}
            />
          </View>
        </View>
        {!dueKey ? (
          <Text className="font-sans text-xs text-stone">No due date · Anytime</Text>
        ) : dueInvalid ? (
          <Text className="font-sans text-xs text-destructive" accessibilityRole="alert">
            Enter a real date (YYYY-MM-DD) and time (HH:mm)
          </Text>
        ) : !timeKey ? (
          <Text className="font-sans text-xs text-stone">No time · any time that day</Text>
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
        disabled={busy || !title.trim() || dueInvalid}
        onPress={submit}
        className="mt-2 self-start rounded-pill px-6"
      >
        <Text className="font-sans-medium text-[15px] text-card">
          {busy ? copy.busyLabel : copy.submitLabel}
        </Text>
        <Ionicons name="checkmark" size={16} color={colors.card} />
      </Button>
    </Sheet>
  );
}
