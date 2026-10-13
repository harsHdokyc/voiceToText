import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api-error';
import { withApiLog } from '@/lib/with-api-log';
import { trackProductEvent } from '@/lib/product-analytics';

export type SuggestionKind = 'task' | 'reminder' | 'idea' | 'question' | 'follow_up';
export type TaskPriority = 'low' | 'normal' | 'high';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type Confidence = 'high' | 'medium' | 'low';

export type TaskSuggestion = {
  id: string;
  user_id?: string;
  note_id: string;
  title: string;
  details: string | null;
  kind: SuggestionKind;
  due_at: string | null;
  priority: TaskPriority | null;
  source_quote: string;
  confidence: Confidence;
  status: SuggestionStatus;
  created_task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SuggestionEdits = {
  title?: string;
  details?: string;
  kind?: SuggestionKind;
  due_at?: string;
  priority?: TaskPriority;
};

export function isPendingSuggestion(status: SuggestionStatus) {
  return status === 'pending';
}

/**
 * Diff draft fields against the stored suggestion for approve-suggestion edits.
 * Throws if the draft title is empty after trim.
 */
export function buildSuggestionEdits(
  original: Pick<
    TaskSuggestion,
    'title' | 'details' | 'kind' | 'due_at' | 'priority'
  >,
  draft: {
    title: string;
    details: string;
    kind: SuggestionKind;
    due_at: string | null;
    priority: TaskPriority | null;
  },
): SuggestionEdits | undefined {
  const title = draft.title.trim();
  if (!title) {
    throw new ApiError('title_required', 'Title is required');
  }
  const details = draft.details.trim() || null;
  const edits: SuggestionEdits = {};
  if (title !== original.title) edits.title = title;
  if (details !== (original.details ?? null)) {
    edits.details = details ?? '';
  }
  if (draft.kind !== original.kind) edits.kind = draft.kind;
  if ((draft.due_at ?? null) !== (original.due_at ?? null)) {
    edits.due_at = draft.due_at ?? undefined;
  }
  if ((draft.priority ?? null) !== (original.priority ?? null)) {
    edits.priority = draft.priority ?? undefined;
  }
  return Object.keys(edits).length > 0 ? edits : undefined;
}

const SUGGESTION_PUBLIC_SELECT =
  'id, note_id, title, details, kind, due_at, priority, source_quote, confidence, status, created_task_id, created_at, updated_at';

export async function getSuggestions(noteId: string) {
  return withApiLog('api.suggestions.list', { noteId }, async () => {
    const { data, error } = await supabase
      .from('task_suggestions')
      .select(SUGGESTION_PUBLIC_SELECT)
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as TaskSuggestion[];
  });
}

type ApproveSuggestionResponse = {
  ok: boolean;
  taskId?: string;
  suggestionId?: string;
  error?: string;
  reason?: string;
};

export async function approveSuggestion(
  suggestionId: string,
  edits?: SuggestionEdits,
) {
  return withApiLog(
    'api.suggestions.approve',
    { suggestionId, hasEdits: !!edits },
    async () => {
      const { data, error } = await supabase.functions.invoke(
        'approve-suggestion',
        {
          body: {
            suggestionId,
            edits: edits ?? undefined,
          },
        },
      );

      const body = (data ?? null) as ApproveSuggestionResponse | null;

      if (error) {
        const fromBody = body?.error;
        throw new ApiError(
          fromBody ?? 'approve_suggestion_failed',
          fromBody
            ? `approve-suggestion failed: ${fromBody}`
            : error.message,
          error,
        );
      }

      if (!body) {
        throw new ApiError(
          'approve_suggestion_empty',
          'approve-suggestion returned an empty body',
        );
      }

      if (body.ok === false) {
        throw new ApiError(
          body.error ?? 'approve_suggestion_failed',
          body.reason ??
            (body.error
              ? `approve-suggestion failed: ${body.error}`
              : 'approve-suggestion returned ok:false'),
        );
      }

      trackProductEvent('suggestion_approved', { suggestionId });
      return body;
    },
  );
}

type RejectSuggestionResponse = {
  ok: boolean;
  suggestionId?: string;
  error?: string;
  reason?: string;
  status?: string;
};

export async function rejectSuggestion(suggestionId: string) {
  return withApiLog('api.suggestions.reject', { suggestionId }, async () => {
    const { data, error } = await supabase.functions.invoke(
      'reject-suggestion',
      {
        body: { suggestionId },
      },
    );

    const body = (data ?? null) as RejectSuggestionResponse | null;

    if (error) {
      const fromBody = body?.error;
      throw new ApiError(
        fromBody ?? 'reject_suggestion_failed',
        fromBody
          ? `reject-suggestion failed: ${fromBody}`
          : error.message,
        error,
      );
    }

    if (!body) {
      throw new ApiError(
        'reject_suggestion_empty',
        'reject-suggestion returned an empty body',
      );
    }

    if (body.ok === false) {
      throw new ApiError(
        body.error ?? 'reject_suggestion_failed',
        body.reason ??
          (body.error
            ? `reject-suggestion failed: ${body.error}`
            : 'reject-suggestion returned ok:false'),
      );
    }

    return body;
  });
}

/** Pending suggestion count for workspace nav badge (RLS scopes to current user). */
export async function countPendingSuggestions() {
  return withApiLog('api.suggestions.countPending', {}, async () => {
    const { count, error } = await supabase
      .from('task_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    return count ?? 0;
  });
}

/** Pending suggestions across notes (newest first) for Overview / inbox. */
export async function listPendingSuggestions(limit = 50) {
  return withApiLog('api.suggestions.listPending', { limit }, async () => {
    const { data, error } = await supabase
      .from('task_suggestions')
      .select(SUGGESTION_PUBLIC_SELECT)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as TaskSuggestion[];
  });
}
