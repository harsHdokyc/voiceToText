import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { NoteCardGrid } from '@/components/note-card';
import { Button, EmptyState, Eyebrow, TextField } from '@/components/ui';
import {
  useWorkspaceDesktop,
  useWorkspaceWide,
  WorkspacePage,
} from '@/components/workspace-page';
import {
  NOTE_CATEGORY_FILTERS,
  type NoteCategoryFilter,
} from '@/features/notes/services/note-category';
import { listNotes } from '@/features/notes/services/notes-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { errorMessageForUi } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

export default function VoiceNotesScreen() {
  const queryClient = useQueryClient();
  const desktop = useWorkspaceDesktop();
  const wide = useWorkspaceWide();
  const [query, setQuery] = useState('');
  const [category, setCategory] =
    useState<NoteCategoryFilter>('All notes');

  const notes = useQuery({
    queryKey: ['notes', query, category],
    queryFn: () => listNotes({ query, category }),
  });

  const removeNote = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] });
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return (
    <WorkspacePage gap={0}>
      <Eyebrow>Your thinking, collected</Eyebrow>
      <Text
        className={cn(
          'mt-3 font-display text-[32px] font-medium text-ink',
          desktop && 'text-[48px]',
        )}
      >
        Voice <Text className="font-sans-italic text-cobalt">notes.</Text>
      </Text>

      {/* Prototype: my-8 grid lg:grid-cols-[1fr_18rem] — chips | search */}
      <View
        className={cn('my-8 gap-4', wide && 'flex-row items-center gap-4')}
      >
        <View className={cn('min-w-0 flex-row flex-wrap gap-2', wide && 'flex-1')}>
          {NOTE_CATEGORY_FILTERS.map((c) => (
            <Button
              key={c}
              variant={c === category ? 'ink' : 'quiet'}
              size="sm"
              onPress={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </View>
        <View
          className={cn(
            'relative w-full justify-center',
            wide && 'w-notes-search shrink-0',
          )}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.stone}
            style={{ position: 'absolute', left: 12, zIndex: 1 }}
          />
          <TextField
            placeholder="Search your thoughts"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search notes"
            className="h-11 min-h-[44px] rounded-lg py-0 pl-10"
          />
        </View>
      </View>

      {notes.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : notes.isError ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(notes.error, 'Failed to load')}
        </Text>
      ) : (notes.data ?? []).length ? (
        <NoteCardGrid
          notes={notes.data ?? []}
          onDelete={(id) => removeNote.mutate(id)}
        />
      ) : (
        <EmptyState
          title="No notes found."
          body="Try another search or capture a new thought."
        />
      )}
      {removeNote.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(removeNote.error, 'Delete failed')}
        </Text>
      ) : null}
    </WorkspacePage>
  );
}
