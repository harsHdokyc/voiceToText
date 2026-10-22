import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, iconPressClassName } from '@/components/ui';
import {
  dueLabel,
  isOverdueDueLabel,
} from '@/features/tasks/services/task-due-label';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

type BaseProps = {
  title: string;
  kindLabel: string;
  dueAt: string | null;
  sourceNoteId: string | null;
  onEdit?: () => void;
};

function SourceNoteLink({ noteId }: { noteId: string }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/notes/[noteId]',
          params: { noteId },
        })
      }
      className="ml-1 flex-row items-center gap-0.5 rounded-sm px-1 py-0.5 web:transition-colors web:duration-200 hover:bg-lime active:bg-lime/80"
    >
      <Text className="font-sans text-xs text-stone">Source note</Text>
      <Ionicons name="chevron-forward" size={12} color={colors.stone} />
    </Pressable>
  );
}

export function SuggestionReviewRow({
  title,
  kindLabel,
  dueAt,
  sourceNoteId,
  busy,
  onApprove,
  onDismiss,
  onEdit,
}: BaseProps & {
  busy?: boolean;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const due = dueLabel(dueAt);
  return (
    <View className="flex-row flex-wrap items-start gap-3 border-b border-border py-5">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-lavender">
        <Ionicons name="sparkles" size={16} color={colors.cobalt} />
      </View>
      <View className="min-w-[140px] flex-1 gap-2">
        <Text className="font-sans-medium text-[15px] text-ink">{title}</Text>
        <View className="flex-row flex-wrap items-center gap-1">
          <Text className="font-sans text-xs text-cobalt">{kindLabel}</Text>
          <Text className="font-sans text-xs text-stone">·</Text>
          <Text
            className={cn(
              'font-sans text-xs text-stone',
              isOverdueDueLabel(due) && 'text-destructive',
            )}
          >
            {due}
          </Text>
          {sourceNoteId ? <SourceNoteLink noteId={sourceNoteId} /> : null}
        </View>
      </View>
      <View className="ml-auto flex-row items-center gap-1">
        <Button variant="cta" size="sm" disabled={busy} onPress={onApprove}>
          <Ionicons name="checkmark" size={14} color={colors.card} />
          <Text className="font-sans-medium text-[13px] text-card">Approve</Text>
        </Button>
        {onEdit ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            accessibilityLabel={`Edit ${title}`}
            onPress={onEdit}
          >
            <Ionicons name="pencil" size={16} color={colors.ink} />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          accessibilityLabel={`Dismiss ${title}`}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={18} color={colors.ink} />
        </Button>
      </View>
    </View>
  );
}

export function TaskProgressRow({
  title,
  kindLabel,
  dueAt,
  sourceNoteId,
  done,
  busy,
  onToggleDone,
  onEdit,
  onRemove,
}: BaseProps & {
  done: boolean;
  busy?: boolean;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const due = dueLabel(dueAt);
  return (
    <View className="flex-row flex-wrap items-start gap-3 border-b border-border py-5">
      <Pressable
        accessibilityLabel={done ? `Reopen ${title}` : `Complete ${title}`}
        disabled={busy}
        onPress={onToggleDone}
        className={cn('mt-0.5', iconPressClassName)}
      >
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={done ? colors.cobalt : colors.stone}
        />
      </Pressable>
      <View className="min-w-[140px] flex-1 gap-2">
        <Text
          className={cn(
            'font-sans-medium text-[15px] text-ink',
            done && 'text-stone line-through',
          )}
        >
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1">
          {kindLabel ? (
            <>
              <Text className="font-sans text-xs text-cobalt">{kindLabel}</Text>
              <Text className="font-sans text-xs text-stone">·</Text>
            </>
          ) : null}
          <Text
            className={cn(
              'font-sans text-xs text-stone',
              isOverdueDueLabel(due) && !done && 'text-destructive',
            )}
          >
            {due}
          </Text>
          {sourceNoteId ? <SourceNoteLink noteId={sourceNoteId} /> : null}
        </View>
      </View>
      <View className="ml-auto flex-row items-center gap-1">
        {onEdit ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            accessibilityLabel={`Edit ${title}`}
            onPress={onEdit}
          >
            <Ionicons name="pencil" size={16} color={colors.ink} />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          accessibilityLabel={`Remove ${title}`}
          onPress={onRemove}
        >
          <Ionicons name="trash-outline" size={16} color={colors.ink} />
        </Button>
      </View>
    </View>
  );
}
