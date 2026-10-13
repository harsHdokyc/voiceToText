import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import {
  dueLabel,
  isOverdueDueLabel,
} from '@/features/tasks/services/task-due-label';
import { colors, fonts, space } from '@/theme';

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
      style={styles.sourceLink}
    >
      <Text style={styles.sourceText}>Source note</Text>
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
    <View style={styles.row}>
      <View style={styles.sparkle}>
        <Ionicons name="sparkles" size={16} color={colors.cobalt} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.kind}>{kindLabel}</Text>
          <Text style={styles.dot}>·</Text>
          <Text
            style={[styles.due, isOverdueDueLabel(due) && styles.dueOverdue]}
          >
            {due}
          </Text>
          {sourceNoteId ? <SourceNoteLink noteId={sourceNoteId} /> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Button variant="cta" size="sm" disabled={busy} onPress={onApprove}>
          <Ionicons name="checkmark" size={14} color={colors.card} />
          <Text style={styles.approveLabel}>Approve</Text>
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
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={done ? `Reopen ${title}` : `Complete ${title}`}
        disabled={busy}
        onPress={onToggleDone}
        style={styles.check}
      >
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={done ? colors.cobalt : colors.stone}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
        <View style={styles.metaRow}>
          {kindLabel ? (
            <>
              <Text style={styles.kind}>{kindLabel}</Text>
              <Text style={styles.dot}>·</Text>
            </>
          ) : null}
          <Text
            style={[
              styles.due,
              isOverdueDueLabel(due) && !done && styles.dueOverdue,
            ]}
          >
            {due}
          </Text>
          {sourceNoteId ? <SourceNoteLink noteId={sourceNoteId} /> : null}
        </View>
      </View>
      <View style={styles.actions}>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: space[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sparkle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  check: { marginTop: 2, padding: 2 },
  body: { flex: 1, minWidth: 140, gap: space[2] },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.stone,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[1],
  },
  kind: { fontFamily: fonts.sans, fontSize: 12, color: colors.cobalt },
  dot: { fontFamily: fonts.sans, fontSize: 12, color: colors.stone },
  due: { fontFamily: fonts.sans, fontSize: 12, color: colors.stone },
  dueOverdue: { color: colors.destructive },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  sourceText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.stone,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginLeft: 'auto',
  },
  approveLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.card,
  },
});
