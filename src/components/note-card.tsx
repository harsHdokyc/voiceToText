import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
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
import { cn } from '@/lib/cn';
import { colors, space } from '@/theme';

const TONE_CLASS: Record<NoteCardTone, string> = {
  lavender: 'bg-lavender',
  lime: 'bg-lime',
  muted: 'bg-muted',
};

export function NoteCard({
  note,
  index,
  onDelete,
  style,
  className,
}: {
  note: NoteRow;
  index: number;
  onDelete?: (noteId: string) => void;
  style?: object;
  className?: string;
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
    <View
      className={cn(
        'min-h-[220px] min-w-0 max-w-full gap-3 overflow-hidden rounded-lg p-6',
        TONE_CLASS[tone],
        className,
      )}
      style={style}
    >
      <View className="flex-row items-center justify-between">
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
        <View className="absolute right-4 top-[52px] z-[2] rounded-md border border-border bg-card p-1 shadow-md">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setMenuOpen(false);
              onDelete(note.id);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            <Text className="font-sans text-[13px] text-destructive">
              Delete note
            </Text>
          </Button>
        </View>
      ) : null}
      <Pressable onPress={open} className="min-w-0 flex-1">
        <Text className="mt-2 font-display text-[22px] text-ink" numberOfLines={2}>
          {note.title?.trim() || 'A new thought'}
        </Text>
        <Text
          className="mt-3 font-sans text-sm leading-[22px] text-ink/55"
          numberOfLines={2}
        >
          {transcript}
        </Text>
      </Pressable>
      <View className="mt-auto flex-row items-center justify-between pt-5">
        <Text className="font-mono text-[10px] text-ink/55">
          {formatNoteTime(note.created_at)}
        </Text>
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
    <View
      className="w-full max-w-full flex-row flex-wrap"
      style={{ gap }}
      onLayout={onLayout}
    >
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
