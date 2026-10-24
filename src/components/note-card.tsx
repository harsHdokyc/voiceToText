import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Button, iconPressClassName } from '@/components/ui';
import {
  formatNoteDuration,
  formatNoteTimeShort,
  noteCardTone,
  noteGridLayout,
  noteGridRows,
  noteTitleInitials,
  normalizeNoteCategory,
  type NoteCardTone,
} from '@/features/notes/services/note-category';
import {
  displayTranscript,
  noteStatusShort,
} from '@/features/notes/services/note-status';
import type { NoteRow } from '@/features/notes/services/notes-service';
import { cn } from '@/lib/cn';
import { colors, space } from '@/theme';

const TONE_CLASS: Record<NoteCardTone, string> = {
  lavender: 'bg-lavender',
  lime: 'bg-lime',
  muted: 'bg-muted',
};

const STRIPE_OVERLAY = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent 0px, transparent 8px, rgba(23, 23, 23, 0.12) 8px, rgba(23, 23, 23, 0.12) 10px)',
} as const;

const HARD_SHADOW = {
  boxShadow: `8px 8px 0 ${colors.ink}`,
} as const;

export function NoteCard({
  note,
  index,
  onDelete,
  className,
  compact = false,
}: {
  note: NoteRow;
  index: number;
  onDelete?: (noteId: string) => void;
  className?: string;
  /** Narrow card (< 360px): smaller title + stats so nothing truncates. */
  compact?: boolean;
}) {
  const statValueClass = cn(
    'font-display leading-none text-ink',
    compact ? 'text-[18px]' : 'text-[22px]',
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const tone = noteCardTone(index);
  const category = normalizeNoteCategory(note.category);
  const title = note.title?.trim() || 'A new thought';
  const transcript = displayTranscript(note) ?? 'Processing…';
  const initials = noteTitleInitials(note.title);
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
        'relative min-w-0 max-w-full overflow-hidden border-[5px] border-ink bg-paper',
        className,
      )}
      style={HARD_SHADOW}
    >
      <View
        className={cn(
          'relative h-40 flex-row items-end overflow-hidden border-b-[5px] border-ink',
          TONE_CLASS[tone],
        )}
      >
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={STRIPE_OVERLAY}
        />
        <Text
          pointerEvents="none"
          className="absolute -bottom-2 -right-1 font-display text-[112px] leading-[0.85] text-ink/10"
        >
          {initials}
        </Text>
        <View className="z-[1] ml-5 h-[72px] w-[72px] shrink-0 items-center justify-center border-b-0 border-l-0 border-[5px] border-ink bg-ink">
          <Text className="font-display text-[32px] text-lime">{initials}</Text>
        </View>
        <View
          className="absolute right-3.5 top-3.5 z-[2] border-[3px] border-ink bg-lime px-2 py-0.5"
          style={{ boxShadow: `3px 3px 0 ${colors.ink}` }}
        >
          <Text className="font-mono text-[9px] font-bold uppercase tracking-[1.5px] text-ink">
            {category}
          </Text>
        </View>
        {onDelete ? (
          <Pressable
            accessibilityLabel={`Options for ${title}`}
            onPress={() => setMenuOpen((v) => !v)}
            hitSlop={12}
            className={cn(
              'absolute bottom-3 right-3 z-[2] border-[3px] border-ink bg-paper p-1',
              iconPressClassName,
            )}
            style={{ boxShadow: `2px 2px 0 ${colors.ink}` }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      {menuOpen && onDelete ? (
        <View className="absolute right-3 top-[148px] z-[3] border-[3px] border-ink bg-card p-1">
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

      <View className="min-w-0 flex-1 px-[18px] pb-0 pt-4">
        <Text
          className={cn(
            'mb-2.5 font-display text-ink',
            compact
              ? 'text-[28px] leading-[32px]'
              : 'text-[36px] leading-[40px]',
          )}
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="mb-3.5 border-l-[5px] border-cobalt pl-2.5">
          <Text
            className="font-sans text-[12px] leading-[1.55] text-ink"
            numberOfLines={3}
          >
            {transcript}
          </Text>
        </View>
      </View>

      <View className="flex-row border-t-[3px] border-ink">
        <View className="flex-1 items-center border-r-[3px] border-ink px-1.5 py-3">
          <Text className={statValueClass} numberOfLines={1}>
            {formatNoteDuration(note.audio_duration_seconds)}
          </Text>
          <Text className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[1.2px] text-stone">
            Sec
          </Text>
        </View>
        <View className="flex-1 items-center border-r-[3px] border-ink px-1.5 py-3">
          <Text className={statValueClass} numberOfLines={1}>
            {noteStatusShort(note.status, note.last_error_code)}
          </Text>
          <Text className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[1.2px] text-stone">
            State
          </Text>
        </View>
        <View className="flex-1 items-center px-1.5 py-3">
          <Text className={statValueClass} numberOfLines={1}>
            {formatNoteTimeShort(note.created_at)}
          </Text>
          <Text className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[1.2px] text-stone">
            When
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}`}
        onPress={open}
        className="group w-full items-center border-t-[5px] border-ink bg-ink py-3.5 web:transition-colors web:duration-150 hover:bg-lime active:bg-lime"
      >
        <Text className="font-display text-[17px] tracking-[3px] text-lime web:transition-colors web:duration-150 group-hover:text-ink group-active:text-ink">
          OPEN NOTE
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * 1–3 columns from the grid's own width (sidebar-aware). Explicit flex rows,
 * not flex-wrap + pixel widths, so a card can never spill onto the next line.
 */
export function NoteCardGrid({
  notes,
  onDelete,
}: {
  notes: NoteRow[];
  onDelete?: (noteId: string) => void;
}) {
  const gap = space[4];
  const [gridW, setGridW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    setGridW(e.nativeEvent.layout.width);
  };
  const { cols, cardWidth } = noteGridLayout(gridW, gap);
  const compact = cardWidth > 0 && cardWidth < 360;

  return (
    <View className="w-full" style={{ gap }} onLayout={onLayout}>
      {noteGridRows(notes, cols).map((row, r) => (
        <View key={row[0]!.id} className="flex-row" style={{ gap }}>
          {row.map((note, c) => (
            <NoteCard
              key={note.id}
              note={note}
              index={r * cols + c}
              onDelete={onDelete}
              compact={compact}
              className="flex-1"
            />
          ))}
          {Array.from({ length: cols - row.length }, (_, i) => (
            <View key={`spacer-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
