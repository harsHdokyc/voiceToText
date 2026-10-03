import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { edgeLog } from "../_shared/log.ts";

/**
 * Delete a note the user owns: remove private audio object, then DB row (cascade).
 * Body: { noteId: string }
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

    const body = (await req.json().catch(() => ({}))) as { noteId?: string };
    const noteId = body.noteId?.trim();
    if (!noteId) {
      return Response.json({ ok: false, error: "note_id_required" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.delete-note", { event: "start", noteId });

    try {
      const { data: note, error: loadError } = await ctx.supabase
        .from("notes")
        .select("id, user_id, audio_path")
        .eq("id", noteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (loadError) throw new Error(`note_load_failed: ${loadError.message}`);
      if (!note) {
        return Response.json({ ok: false, error: "note_not_found" }, {
          status: 404,
        });
      }

      if (note.audio_path) {
        const admin = serviceClient();
        const { error: storageError } = await admin.storage
          .from("note-audio")
          .remove([note.audio_path]);
        if (storageError) {
          edgeLog("warn", "edge.delete-note", {
            event: "storage_cleanup_failed",
            code: "storage_delete_failed",
            reason: storageError.message.slice(0, 200),
            noteId,
          });
          // Continue — orphan cleanup can retry; DB delete still proceeds.
        }
      }

      const { error: deleteError } = await ctx.supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", userId);
      if (deleteError) {
        throw new Error(`note_delete_failed: ${deleteError.message}`);
      }

      edgeLog("info", "edge.delete-note", {
        event: "ok",
        noteId,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: true, noteId });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "delete_failed";
      const code = reason.split(":")[0]?.trim() || "delete_failed";
      edgeLog("error", "edge.delete-note", {
        event: "fail",
        code,
        reason,
        noteId,
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
    throw new Error("misconfigured: missing service role for storage delete");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
