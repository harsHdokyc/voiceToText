import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import { serviceClient } from "../_shared/service-role.ts";

const SCOPE = "edge.delete-account";

/**
 * Delete the caller's app data + auth user.
 * Body: { confirm: "DELETE" }
 * 1) List note audio paths 2) remove storage 3) delete_own_app_data RPC 4) admin deleteUser
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

    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    if (body.confirm !== "DELETE") {
      return r.fail(400, "confirm_required", 'Body.confirm must be "DELETE"');
    }

    edgeLog("info", SCOPE, { event: "start" });

    try {
      const admin = serviceClient();

      const { data: notes } = await ctx.supabase
        .from("notes")
        .select("audio_path")
        .eq("user_id", userId);
      const paths = (notes ?? [])
        .map((n) => n.audio_path as string | null)
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: storageError } = await admin.storage
          .from("note-audio")
          .remove(paths);
        if (storageError) {
          edgeLog("warn", SCOPE, {
            event: "storage_cleanup_failed",
            code: "storage_delete_failed",
            reason: storageError.message.slice(0, 200),
            pathCount: paths.length,
          });
        }
      }

      const { data: wipe, error: wipeError } = await ctx.supabase.rpc(
        "delete_own_app_data",
      );
      if (wipeError) {
        throw new Error(`app_data_wipe_failed: ${wipeError.message}`);
      }
      const wipeResult = wipe as { ok?: boolean; error?: string };
      if (!wipeResult?.ok) {
        throw new Error(
          `app_data_wipe_failed: ${wipeResult?.error ?? "unknown"}`,
        );
      }

      const { error: authError } = await admin.auth.admin.deleteUser(userId);
      if (authError) {
        throw new Error(`auth_delete_failed: ${authError.message}`);
      }

      edgeLog("info", SCOPE, { event: "ok", durationMs: r.ms() });
      return Response.json({ ok: true });
    } catch (error) {
      return r.failFrom(error, "delete_account_failed");
    }
  }),
};
