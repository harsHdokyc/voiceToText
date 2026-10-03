import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { edgeLog } from "../_shared/log.ts";

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

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => ({}))) as { confirm?: string };
    if (body.confirm !== "DELETE") {
      return Response.json({ ok: false, error: "confirm_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.delete-account", { event: "start" });

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
          edgeLog("warn", "edge.delete-account", {
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

      edgeLog("info", "edge.delete-account", {
        event: "ok",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: true });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "delete_account_failed";
      const code = reason.split(":")[0]?.trim() || "delete_account_failed";
      edgeLog("error", "edge.delete-account", {
        event: "fail",
        code,
        reason,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: code, reason }, { status: 502 });
    }
  }),
};

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("misconfigured: missing service role");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
