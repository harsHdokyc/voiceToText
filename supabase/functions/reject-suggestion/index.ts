import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";

const SCOPE = "edge.reject-suggestion";

/**
 * Reject a pending suggestion.
 * Body: { suggestionId }
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
    };
    const suggestionId = body.suggestionId?.trim();
    if (!suggestionId) {
      return r.fail(400, "suggestion_id_required", "Body.suggestionId missing");
    }

    edgeLog("info", SCOPE, { event: "start", suggestionId });

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
        return r.fail(
          404,
          "suggestion_not_found",
          "Suggestion missing or not owned by caller",
          { suggestionId },
        );
      }
      if (suggestion.status !== "pending") {
        return r.fail(
          400,
          "not_pending",
          `Suggestion status is ${suggestion.status}, not pending`,
          { suggestionId, status: suggestion.status },
          { status: suggestion.status },
        );
      }

      const { data: rejected, error: updateError } = await ctx.supabase
        .from("task_suggestions")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) {
        throw new Error(`rejection_update_failed: ${updateError.message}`);
      }
      if (!rejected) {
        return r.fail(
          400,
          "not_pending",
          "Suggestion left pending before the reject was saved",
          { suggestionId },
        );
      }

      edgeLog("info", SCOPE, {
        event: "ok",
        suggestionId,
        noteId: suggestion.note_id,
        durationMs: r.ms(),
      });

      return Response.json({ ok: true, suggestionId });
    } catch (error) {
      return r.failFrom(error, "rejection_failed", { suggestionId });
    }
  }),
};
