import { buildTaskEdits, type TaskPriority } from '@/features/tasks/services/task-status';
import { supabase } from '@/lib/supabase';
import { invokeEdge } from '@/lib/invoke-edge';
import { withApiLog } from '@/lib/with-api-log';
import { trackProductEvent } from '@/lib/product-analytics';

export type SuggestionKind = 'task' | 'reminder' | 'idea' | 'question' | 'follow_up';
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

/**
 * Task diff + kind, for approve-suggestion edits. Throws if the draft title is blank.
 * A cleared due date/priority is not sent: approve-suggestion only accepts values.
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
  const { due_at, priority, ...rest } = buildTaskEdits(original, draft) ?? {};
  const edits: SuggestionEdits = rest;
  if (due_at) edits.due_at = due_at;
  if (priority) edits.priority = priority;
  if (draft.kind !== original.kind) edits.kind = draft.kind;
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
      const body = await invokeEdge<ApproveSuggestionResponse>('approve-suggestion', 'approve_suggestion', {
        suggestionId,
        edits: edits ?? undefined,
      });
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
  return withApiLog('api.suggestions.reject', { suggestionId }, () =>
    invokeEdge<RejectSuggestionResponse>('reject-suggestion', 'reject_suggestion', { suggestionId }),
  );
}

/** Pending suggestions across notes (newest first) for Overview / inbox / nav badge. */
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
