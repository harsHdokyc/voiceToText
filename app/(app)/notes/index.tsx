import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
import { colors, fonts, layout, radius, space } from '@/theme';

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
      <Text style={[styles.title, desktop && styles.titleDesktop]}>
        Voice <Text style={styles.titleAccent}>notes.</Text>
      </Text>

      {/* Prototype: my-8 grid lg:grid-cols-[1fr_18rem] — chips | search */}
      <View style={[styles.toolbar, wide && styles.toolbarWide]}>
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
        <View style={[styles.searchWrap, wide && styles.searchWrapWide]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.stone}
            style={styles.searchIcon}
          />
          <TextField
            placeholder="Search your thoughts"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search notes"
            style={styles.searchField}
          />
        </View>
      </View>

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
    </WorkspacePage>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: space[3],
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '500',
    color: colors.ink,
  },
  titleDesktop: { fontSize: 48 },
  titleAccent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
  toolbar: {
    marginVertical: space[8],
    gap: space[4],
  },
  toolbarWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  filters: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    minWidth: 0,
  },
  searchWrap: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  searchWrapWide: {
    width: layout.notesSearchWidth,
    flexShrink: 0,
  },
  searchIcon: {
    position: 'absolute',
    left: space[3],
    zIndex: 1,
  },
  searchField: {
    minHeight: 44,
    height: 44,
    borderRadius: radius.lg,
    paddingLeft: space[10],
    paddingVertical: 0,
  },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
