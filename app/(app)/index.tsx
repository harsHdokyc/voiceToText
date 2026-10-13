import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { NoteCardGrid } from '@/components/note-card';
import { Button, EmptyState, Eyebrow, VoiceRibbon } from '@/components/ui';
import {
  SuggestionReviewRow,
  TaskProgressRow,
} from '@/components/work-row';
import { listNotes } from '@/features/notes/services/notes-service';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import {
  approveSuggestion,
  listPendingSuggestions,
  rejectSuggestion,
} from '@/features/notes/services/suggestions-service';
import { deleteNote } from '@/features/settings/services/account-service';
import { greetingName } from '@/features/settings/services/greeting-name';
import { getOwnProfile } from '@/features/settings/services/profile-service';
import {
  archiveTask,
  completeTask,
  listTasks,
  reopenTask,
  type TaskRow,
} from '@/features/tasks/services/tasks-service';
import { errorMessageForUi } from '@/lib/api-error';
import { useAuth } from '@/providers/auth-provider';
import { colors, fonts, radius, space } from '@/theme';

/**
 * Overview — layout mirrored from ui/goals-in-motion-55 Workspace.tsx Overview,
 * wired to live notes / suggestions / tasks.
 */
export default function OverviewScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const desktop = width >= 768;
  const wide = width >= 1024;

  const profile = useQuery({ queryKey: ['profile'], queryFn: getOwnProfile });
  const notes = useQuery({
    queryKey: ['notes', ''],
    queryFn: () => listNotes(),
  });
  const pending = useQuery({
    queryKey: ['suggestions', 'pending'],
    queryFn: () => listPendingSuggestions(20),
  });
  const tasks = useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: () => listTasks({ status: 'open' }),
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const removeNote = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: invalidateAll,
  });
  const approve = useMutation({
    mutationFn: (id: string) => approveSuggestion(id),
    onSuccess: invalidateAll,
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectSuggestion(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
  const toggleTask = useMutation({
    mutationFn: async (task: TaskRow) => {
      if (task.status === 'completed') return reopenTask(task.id);
      return completeTask(task.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const removeTask = useMutation({
    mutationFn: (id: string) => archiveTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const name = greetingName(profile.data?.display_name, user?.email);
  const pendingRows = pending.data ?? [];
  const openTasks = tasks.data ?? [];
  const recent = (notes.data ?? []).slice(0, 6);
  const busy =
    approve.isPending ||
    reject.isPending ||
    toggleTask.isPending ||
    removeTask.isPending;
  const openCapture = () => router.push('/(app)/record' as Href);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        desktop && styles.contentDesktop,
      ]}
    >
      {/* Greeting + counts — lg:grid-cols-[1fr_auto] */}
      <View style={[styles.greetingRow, wide && styles.greetingRowWide]}>
        <View style={styles.greetingCopy}>
          <Eyebrow>A little room to think</Eyebrow>
          <Text style={[styles.greeting, desktop && styles.greetingLg]}>
            Good to see you,{' '}
            <Text style={styles.greetingName}>{name}.</Text>
          </Text>
          <Text style={styles.sub}>Your thoughts have somewhere to go.</Text>
        </View>
        <View style={styles.counts}>
          <View>
            <Text style={styles.countNum}>
              {String(pendingRows.length).padStart(2, '0')}
            </Text>
            <Text style={styles.countLabel}>To review</Text>
          </View>
          <View>
            <Text style={styles.countNum}>
              {String(openTasks.length).padStart(2, '0')}
            </Text>
            <Text style={styles.countLabel}>Next steps</Text>
          </View>
        </View>
      </View>

      {/* Cobalt band — md: two columns copy | lime ribbon */}
      <View style={[styles.cobalt, desktop && styles.cobaltDesktop]}>
        <View style={styles.cobaltCopy}>
          <Eyebrow color="rgba(255,255,255,0.7)">
            From thought to follow-through
          </Eyebrow>
          <Text style={[styles.cobaltTitle, desktop && styles.cobaltTitleLg]}>
            What’s on your mind?
          </Text>
          <Text style={styles.cobaltBody}>
            The first version doesn’t need to be perfect.
          </Text>
          <Button
            variant="lime"
            size="lg"
            style={styles.cobaltBtn}
            onPress={openCapture}
          >
            <Ionicons name="mic" size={18} color={colors.ink} />
            <Text style={styles.cobaltBtnText}>New voice note</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.ink} />
          </Button>
        </View>
        <View style={[styles.ribbonWrap, desktop && styles.ribbonWrapDesktop]}>
          <VoiceRibbon color={colors.lime} />
        </View>
      </View>

      {/* Recent thoughts */}
      <View style={styles.recentHead}>
        <Text style={styles.sectionTitle}>Recent thoughts</Text>
        <Pressable
          onPress={() => router.push('/(app)/notes' as Href)}
          style={styles.allNotes}
        >
          <Text style={styles.allNotesText}>All notes</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.cobalt} />
        </Pressable>
      </View>
      {notes.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : notes.isError ? (
        <Text style={styles.error}>
          {errorMessageForUi(notes.error, 'Failed to load notes')}
        </Text>
      ) : recent.length ? (
        <NoteCardGrid
          notes={recent}
          onDelete={(id) => removeNote.mutate(id)}
        />
      ) : (
        <EmptyState
          title="No notes yet."
          body="Capture a thought to see it here."
        />
      )}

      {/* Waiting + next steps — lg: 2 cols */}
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={styles.column}>
          <View style={styles.columnHead}>
            <Text style={styles.sectionTitle}>
              Waiting for your call{' '}
              <Text style={styles.pendingCount}>{pendingRows.length}</Text>
            </Text>
            <Pressable
              accessibilityLabel="All suggestions"
              onPress={() => router.push('/(app)/suggestions' as Href)}
              hitSlop={8}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {pending.isLoading ? (
            <ActivityIndicator color={colors.cobalt} />
          ) : pending.isError ? (
            <Text style={styles.error}>
              {errorMessageForUi(pending.error, 'Failed to load suggestions')}
            </Text>
          ) : pendingRows.length ? (
            pendingRows.slice(0, 2).map((s) => (
              <SuggestionReviewRow
                key={s.id}
                title={s.title}
                kindLabel={suggestionKindLabel(s.kind)}
                dueAt={s.due_at}
                sourceNoteId={s.note_id}
                busy={busy}
                onApprove={() => approve.mutate(s.id)}
                onDismiss={() => reject.mutate(s.id)}
                onEdit={() =>
                  router.push({
                    pathname: '/(app)/notes/[noteId]',
                    params: { noteId: s.note_id },
                  })
                }
              />
            ))
          ) : (
            <EmptyState
              title="All caught up."
              body="No suggestions waiting for your review."
            />
          )}
        </View>

        <View style={styles.column}>
          <View style={styles.columnHead}>
            <Text style={styles.sectionTitle}>Your next steps</Text>
            <Pressable
              accessibilityLabel="All tasks"
              onPress={() => router.push('/(app)/tasks' as Href)}
              hitSlop={8}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {tasks.isLoading ? (
            <ActivityIndicator color={colors.cobalt} />
          ) : tasks.isError ? (
            <Text style={styles.error}>
              {errorMessageForUi(tasks.error, 'Failed to load tasks')}
            </Text>
          ) : openTasks.length ? (
            openTasks.slice(0, 3).map((t) => (
              <TaskProgressRow
                key={t.id}
                title={t.title}
                kindLabel="Task"
                dueAt={t.due_at}
                sourceNoteId={t.source_note_id}
                done={t.status === 'completed'}
                busy={busy}
                onToggleDone={() => toggleTask.mutate(t)}
                onEdit={() =>
                  router.push({
                    pathname: '/(app)/tasks/[taskId]',
                    params: { taskId: t.id },
                  })
                }
                onRemove={() => removeTask.mutate(t.id)}
              />
            ))
          ) : (
            <EmptyState
              title="A clean slate."
              body="Approved suggestions will appear here."
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    gap: space[6],
    paddingBottom: space[10],
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingHorizontal: space[10],
    paddingVertical: space[10],
  },
  greetingRow: { gap: space[6] },
  greetingRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  greetingCopy: { flex: 1, minWidth: 0, gap: space[3] },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '500',
    color: colors.ink,
    lineHeight: 38,
  },
  greetingLg: { fontSize: 48, lineHeight: 54 },
  greetingName: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
  sub: { fontFamily: fonts.sans, fontSize: 16, color: colors.stone },
  counts: { flexDirection: 'row', gap: space[8] },
  countNum: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.ink,
  },
  countLabel: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.stone,
  },
  cobalt: {
    backgroundColor: colors.cobalt,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[4],
    overflow: 'hidden',
  },
  cobaltDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[8],
    gap: space[6],
  },
  cobaltCopy: { flex: 1, minWidth: 0, gap: space[3] },
  cobaltTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '500',
    color: colors.card,
  },
  cobaltTitleLg: { fontSize: 40 },
  cobaltBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    maxWidth: 320,
  },
  cobaltBtn: { alignSelf: 'flex-start', marginTop: space[3] },
  cobaltBtnText: {
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    fontSize: 14,
  },
  ribbonWrap: { minHeight: 72 },
  ribbonWrapDesktop: { flex: 0.7, minWidth: 0 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[2],
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '500',
    color: colors.ink,
  },
  allNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allNotesText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.cobalt,
  },
  pendingCount: {
    color: colors.cobalt,
    fontSize: 14,
    fontFamily: fonts.sans,
  },
  columns: { gap: space[10], marginTop: space[2] },
  columnsWide: { flexDirection: 'row' },
  column: { flex: 1, minWidth: 0 },
  columnHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: space[4],
    marginBottom: space[1],
  },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
