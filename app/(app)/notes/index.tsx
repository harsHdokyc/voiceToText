import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NoteCardGrid } from '@/components/note-card';
import { Button, EmptyState, Eyebrow, TextField } from '@/components/ui';
import {
  NOTE_CATEGORY_FILTERS,
  type NoteCategoryFilter,
} from '@/features/notes/services/note-category';
import { listNotes } from '@/features/notes/services/notes-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, space } from '@/theme';

export default function VoiceNotesScreen() {
  const queryClient = useQueryClient();
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Eyebrow>Your thinking, collected</Eyebrow>
      <Text style={styles.title}>
        Voice <Text style={styles.titleAccent}>notes.</Text>
      </Text>

      <View style={styles.filters}>
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

      <TextField
        placeholder="Search your thoughts"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search notes"
      />

      {notes.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : notes.isError ? (
        <Text style={styles.error}>
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
        <Text style={styles.error}>
          {errorMessageForUi(removeNote.error, 'Delete failed')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    padding: space[5],
    gap: space[4],
    paddingBottom: space[10],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
  },
  titleAccent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
