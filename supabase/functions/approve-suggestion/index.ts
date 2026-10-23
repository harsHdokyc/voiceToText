import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";

const SCOPE = "edge.approve-suggestion";

/**
 * Approve a suggestion and atomically create a task (RPC).
 * Body: { suggestionId, edits?: { title?, details?, kind?, due_at?, priority? } }
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const r = edgeRequest(SCOPE);
    const userId = ctx.userClaims?.id;
    if (!userId) {
      return r.fail(401, "unauthorized", "Missing user claims");
    }

    const body = (await req.json().catch(() => ({}))) as {
      suggestionId?: string;
      edits?: {
        title?: string;
        details?: string;
        kind?: "task" | "reminder" | "idea" | "question" | "follow_up";
        due_at?: string;
        priority?: "low" | "normal" | "high";
      };
    };
    const suggestionId = body.suggestionId?.trim();
    if (!suggestionId) {
      return r.fail(400, "suggestion_id_required", "Body.suggestionId missing");
    }

    const rawDue = body.edits?.due_at;
    const dueMs = rawDue ? Date.parse(rawDue) : NaN;
    if (rawDue && Number.isNaN(dueMs)) {
      return r.fail(400, "invalid_due_at", "edits.due_at is not a valid date", {
        suggestionId,
      });
    }

    edgeLog("info", SCOPE, { event: "start", suggestionId });

    try {
      const { data, error } = await ctx.supabase.rpc("approve_suggestion", {
        p_suggestion_id: suggestionId,
        p_edited_title: body.edits?.title ?? null,
        p_edited_details: body.edits?.details ?? null,
        p_edited_kind: body.edits?.kind ?? null,
        p_edited_due_at: rawDue ? new Date(dueMs).toISOString() : null,
        p_edited_priority: body.edits?.priority ?? null,
      });

      if (error) throw new Error(`rpc_failed: ${error.message}`);

      const result = data as { ok: boolean; task_id?: string; error?: string };
      if (!result.ok) {
        return r.fail(
          400,
          result.error ?? "approval_failed",
          result.error ?? "Unknown approval failure",
          { suggestionId },
        );
      }

      edgeLog("info", SCOPE, {
        event: "ok",
        suggestionId,
        taskId: result.task_id,
        durationMs: r.ms(),
      });

      return Response.json({
        ok: true,
        taskId: result.task_id,
        suggestionId,
      });
    } catch (error) {
      return r.failFrom(error, "approval_failed", { suggestionId });
    }
  }),
};
