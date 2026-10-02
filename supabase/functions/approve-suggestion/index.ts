import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeLog } from "../_shared/log.ts";

/**
 * Approve a suggestion and atomically create a task (RPC).
 * Body: { suggestionId, edits?: { title?, details?, kind?, due_at?, priority? } }
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      edgeLog("error", "edge.approve-suggestion", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing user claims",
      });
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
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
      edgeLog("error", "edge.approve-suggestion", {
        event: "fail",
        code: "suggestion_id_required",
        reason: "Body.suggestionId missing",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "suggestion_id_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.approve-suggestion", {
      event: "start",
      suggestionId,
    });

    try {
      const { data, error } = await ctx.supabase.rpc("approve_suggestion", {
        p_suggestion_id: suggestionId,
        p_edited_title: body.edits?.title ?? null,
        p_edited_details: body.edits?.details ?? null,
        p_edited_kind: body.edits?.kind ?? null,
        p_edited_due_at: body.edits?.due_at
          ? new Date(body.edits.due_at).toISOString()
          : null,
        p_edited_priority: body.edits?.priority ?? null,
      });

      if (error) throw new Error(`rpc_failed: ${error.message}`);

      const result = data as { ok: boolean; task_id?: string; error?: string };
      if (!result.ok) {
        edgeLog("error", "edge.approve-suggestion", {
          event: "fail",
          code: result.error ?? "approval_failed",
          reason: result.error ?? "Unknown approval failure",
          suggestionId,
          durationMs: Date.now() - started,
        });
        return Response.json(
          { ok: false, error: result.error ?? "approval_failed" },
          { status: 400 },
        );
      }

      edgeLog("info", "edge.approve-suggestion", {
        event: "ok",
        suggestionId,
        taskId: result.task_id,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        taskId: result.task_id,
        suggestionId,
      });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "approval_failed";
      const code = reason.split(":")[0]?.trim() || "approval_failed";

      edgeLog("error", "edge.approve-suggestion", {
        event: "fail",
        code,
        reason,
        suggestionId,
        durationMs: Date.now() - started,
      });

      return Response.json({ ok: false, error: code, reason }, { status: 502 });
    }
  }),
};
