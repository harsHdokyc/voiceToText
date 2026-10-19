import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Button, Eyebrow } from '@/components/ui';
import {
  formatNoteTime,
  noteCardTone,
  normalizeNoteCategory,
  type NoteCardTone,
} from '@/features/notes/services/note-category';
import { displayTranscript } from '@/features/notes/services/note-status';
import type { NoteRow } from '@/features/notes/services/notes-service';
import { colors, fonts, radius, space } from '@/theme';

const TONE_BG: Record<NoteCardTone, string> = {
  lavender: colors.lavender,
  lime: colors.lime,
  muted: colors.muted,
};

export function NoteCard({
  note,
  index,
  onDelete,
  style,
}: {
  note: NoteRow;
  index: number;
  onDelete?: (noteId: string) => void;
  style?: object;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = noteCardTone(index);
  const transcript = displayTranscript(note) ?? 'Processing…';
  const open = () => {
    setMenuOpen(false);
    router.push({
      pathname: '/(app)/notes/[noteId]',
      params: { noteId: note.id },
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: TONE_BG[tone] }, style]}>
      <View style={styles.topRow}>
        <Eyebrow color="rgba(23,23,23,0.55)">
          {normalizeNoteCategory(note.category)}
        </Eyebrow>
        {onDelete ? (
          <Pressable
            accessibilityLabel={`Options for ${note.title ?? 'note'}`}
            onPress={() => setMenuOpen((v) => !v)}
            hitSlop={12}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      {menuOpen && onDelete ? (
        <View style={styles.menu}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setMenuOpen(false);
              onDelete(note.id);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text style={styles.deleteLabel}>Delete note</Text>
          </Button>
        </View>
      ) : null}
      <Pressable onPress={open} style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>
          {note.title?.trim() || 'A new thought'}
        </Text>
        <Text style={styles.preview} numberOfLines={2}>
          {transcript}
        </Text>
      </Pressable>
      <View style={styles.footer}>
        <Text style={styles.time}>{formatNoteTime(note.created_at)}</Text>
        <Pressable
          accessibilityLabel={`Open ${note.title ?? 'note'}`}
          onPress={open}
          hitSlop={12}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

/** Prototype grid: 1 col mobile → 2 sm → 3 xl (matches Workspace noteGrid). */
export function NoteCardGrid({
  notes,
  onDelete,
}: {
  notes: NoteRow[];
  onDelete?: (noteId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 3 : width >= 640 ? 2 : 1;
  const gap = space[4];
  const [gridW, setGridW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    setGridW(e.nativeEvent.layout.width);
  };
  const cardW =
    gridW > 0
      ? cols === 1
        ? gridW
        : (gridW - gap * (cols - 1)) / cols
      : undefined;

  return (
    <View style={[styles.grid, { gap }]} onLayout={onLayout}>
      {notes.map((note, i) => (
        <NoteCard
          key={note.id}
          note={note}
          index={i}
          onDelete={onDelete}
          style={cardW != null ? { width: cardW } : { flexGrow: 1 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: '100%',
  },
  card: {
    minHeight: 220,
    minWidth: 0,
    maxWidth: '100%',
    borderRadius: radius.lg,
    padding: space[6],
    gap: space[3],
    overflow: 'hidden',
  },
  cardBody: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: {
    position: 'absolute',
    right: space[4],
    top: 52,
    zIndex: 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[1],
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  deleteLabel: {
    fontFamily: fonts.sans,
    color: colors.destructive,
    fontSize: 13,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    marginTop: space[2],
  },
  preview: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(23,23,23,0.55)',
    marginTop: space[3],
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[5],
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: 'rgba(23,23,23,0.55)',
  },
});
