import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeLog } from "../_shared/log.ts";

/**
 * Reject a pending suggestion.
 * Body: { suggestionId }
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      edgeLog("error", "edge.reject-suggestion", {
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
    };
    const suggestionId = body.suggestionId?.trim();
    if (!suggestionId) {
      edgeLog("error", "edge.reject-suggestion", {
        event: "fail",
        code: "suggestion_id_required",
        reason: "Body.suggestionId missing",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "suggestion_id_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.reject-suggestion", {
      event: "start",
      suggestionId,
    });

    try {
      const { data: suggestion, error: loadError } = await ctx.supabase
        .from("task_suggestions")
        .select("id, note_id, status")
        .eq("id", suggestionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (loadError) {
        throw new Error(`suggestion_load_failed: ${loadError.message}`);
      }
      if (!suggestion) {
        edgeLog("error", "edge.reject-suggestion", {
          event: "fail",
          code: "suggestion_not_found",
          reason: "Suggestion missing or not owned by caller",
          suggestionId,
          durationMs: Date.now() - started,
        });
        return Response.json({ ok: false, error: "suggestion_not_found" }, {
          status: 404,
        });
      }
      if (suggestion.status !== "pending") {
        edgeLog("error", "edge.reject-suggestion", {
          event: "fail",
          code: "not_pending",
          reason: `Suggestion status is ${suggestion.status}, not pending`,
          suggestionId,
          status: suggestion.status,
          durationMs: Date.now() - started,
        });
        return Response.json(
          { ok: false, error: "not_pending", status: suggestion.status },
          { status: 400 },
        );
      }

      const { error: updateError } = await ctx.supabase
        .from("task_suggestions")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .eq("user_id", userId)
        .eq("status", "pending");

      if (updateError) {
        throw new Error(`rejection_update_failed: ${updateError.message}`);
      }

      edgeLog("info", "edge.reject-suggestion", {
        event: "ok",
        suggestionId,
        noteId: suggestion.note_id,
        durationMs: Date.now() - started,
      });

      return Response.json({ ok: true, suggestionId });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "rejection_failed";
      const code = reason.split(":")[0]?.trim() || "rejection_failed";

      edgeLog("error", "edge.reject-suggestion", {
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
