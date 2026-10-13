import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SuggestionReviewRow } from '@/components/work-row';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import {
  pendingSuggestionIds,
  suggestionKindLabel,
} from '@/features/notes/services/pending-suggestions';
import {
  approveSuggestion,
  listPendingSuggestions,
  rejectSuggestion,
} from '@/features/notes/services/suggestions-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors, fonts, space } from '@/theme';

export default function SuggestionsScreen() {
  const queryClient = useQueryClient();

  const pending = useQuery({
    queryKey: ['suggestions', 'pending'],
    queryFn: () => listPendingSuggestions(100),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => approveSuggestion(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectSuggestion(id),
    onSuccess: invalidate,
  });

  const approveAll = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await approveSuggestion(id);
      }
    },
    onSuccess: invalidate,
  });

  const rows = pending.data ?? [];
  const ids = pendingSuggestionIds(rows);
  const busy =
    approve.isPending || reject.isPending || approveAll.isPending;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Eyebrow>Possibilities, not commitments</Eyebrow>
      <Text style={styles.title}>
        Your <Text style={styles.accent}>call.</Text>
      </Text>

      <View style={styles.toolbar}>
        <Text style={styles.countLine}>
          {ids.length} suggestion{ids.length === 1 ? '' : 's'} waiting for a
          decision.
        </Text>
        {ids.length > 0 ? (
          <Button
            variant="quiet"
            size="sm"
            disabled={busy}
            onPress={() => approveAll.mutate(ids)}
          >
            {approveAll.isPending ? 'Approving…' : 'Approve all'}
          </Button>
        ) : null}
      </View>

      {pending.isLoading ? (
        <ActivityIndicator color={colors.cobalt} />
      ) : pending.isError ? (
        <Text style={styles.error}>
          {errorMessageForUi(pending.error, 'Failed to load suggestions')}
        </Text>
      ) : ids.length ? (
        <View style={styles.list}>
          {rows.map((s) => (
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
          ))}
        </View>
      ) : (
        <>
          <EmptyState
            title="All caught up."
            body="Everything has been reviewed. Your chosen actions are in Tasks."
          />
          <Button
            variant="cta"
            onPress={() => router.push('/(app)/tasks' as Href)}
          >
            Go to tasks
          </Button>
        </>
      )}

      {approve.error || reject.error || approveAll.error ? (
        <Text style={styles.error}>
          {errorMessageForUi(
            approve.error ?? reject.error ?? approveAll.error,
            'Update failed',
          )}
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
  accent: {
    fontFamily: fonts.sansItalic,
    color: colors.cobalt,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  countLine: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
    flex: 1,
    minWidth: 160,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: { fontFamily: fonts.sans, color: colors.destructive },
});
