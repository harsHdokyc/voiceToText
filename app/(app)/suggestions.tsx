import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { SuggestionReviewRow } from '@/components/work-row';
import {
  pendingSuggestionIds,
  suggestionKindLabel,
} from '@/features/notes/services/pending-suggestions';
import { approveSuggestionWithEdit } from '@/features/notes/services/suggestion-edit-save';
import {
  approveSuggestion,
  listPendingSuggestions,
  rejectSuggestion,
  type TaskSuggestion,
} from '@/features/notes/services/suggestions-service';
import { errorMessageForUi } from '@/lib/api-error';
import { colors } from '@/theme';

export default function SuggestionsScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaskSuggestion | null>(null);

  const pending = useQuery({
    queryKey: ['suggestions', 'pending'],
    queryFn: () => listPendingSuggestions(100),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
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

  const saveEdit = useMutation({
    mutationFn: approveSuggestionWithEdit,
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
  });

  const rows = pending.data ?? [];
  const ids = pendingSuggestionIds(rows);
  const busy =
    approve.isPending ||
    reject.isPending ||
    approveAll.isPending ||
    saveEdit.isPending;

  return (
    <WorkspacePage>
      <Eyebrow>Possibilities, not commitments</Eyebrow>
      <Text className="font-display text-4xl text-ink">
        Your <Text className="font-sans-italic text-cobalt">call.</Text>
      </Text>

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text className="min-w-[160px] flex-1 font-sans text-sm text-stone">
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
        <Text className="font-sans text-destructive">
          {errorMessageForUi(pending.error, 'Failed to load suggestions')}
        </Text>
      ) : ids.length ? (
        <View className="border-t border-border">
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
              onEdit={() => setEditing(s)}
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
        <Text className="font-sans text-destructive">
          {errorMessageForUi(
            approve.error ?? reject.error ?? approveAll.error,
            'Update failed',
          )}
        </Text>
      ) : null}

      <EditNextStepSheet
        open={editing !== null}
        onClose={() => {
          if (!saveEdit.isPending) setEditing(null);
        }}
        initialTitle={editing?.title ?? ''}
        initialDueAt={editing?.due_at ?? null}
        mode="suggestion"
        busy={saveEdit.isPending}
        error={
          saveEdit.error
            ? errorMessageForUi(saveEdit.error, 'Save failed')
            : null
        }
        onSave={(draft) => {
          if (!editing) return;
          saveEdit.mutate({
            suggestion: editing,
            title: draft.title,
            dueAt: draft.dueAt,
            reminderHours: draft.reminderHours,
          });
        }}
      />
    </WorkspacePage>
  );
}
