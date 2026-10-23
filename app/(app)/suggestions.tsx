import { router, type Href } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { EditNextStepSheet } from '@/components/edit-next-step-sheet';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WorkspacePage } from '@/components/workspace-page';
import { SuggestionReviewRow } from '@/components/work-row';
import {
  usePendingSuggestions,
  useSuggestionReview,
} from '@/features/notes/hooks/use-suggestion-review';
import { suggestionKindLabel } from '@/features/notes/services/pending-suggestions';
import { errorMessageForUi } from '@/lib/api-error';
import { colors } from '@/theme';

export default function SuggestionsScreen() {
  const pending = usePendingSuggestions();
  const review = useSuggestionReview();

  const rows = pending.data ?? [];
  const ids = rows.map((r) => r.id);

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
            disabled={review.anyBusy}
            onPress={() => review.approveAll(ids)}
          >
            {review.approvingAll ? 'Approving…' : 'Approve all'}
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
              busy={review.isBusy(s.id)}
              onApprove={() => review.approve(s)}
              onDismiss={() => review.dismiss(s)}
              onEdit={() => review.edit(s)}
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

      {review.error ? (
        <Text className="font-sans text-destructive">
          {errorMessageForUi(review.error, 'Update failed')}
        </Text>
      ) : null}

      <EditNextStepSheet {...review.sheet} />
    </WorkspacePage>
  );
}
