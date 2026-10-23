import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";
import { serviceClient } from "../_shared/service-role.ts";

const SCOPE = "edge.delete-note";

/**
 * Delete a note the user owns: remove private audio object, then DB row (cascade).
 * Body: { noteId: string }
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

    const body = (await req.json().catch(() => ({}))) as { noteId?: string };
    const noteId = body.noteId?.trim();
    if (!noteId) {
      return r.fail(400, "note_id_required", "Body.noteId missing");
    }

    edgeLog("info", SCOPE, { event: "start", noteId });

    try {
      const { data: note, error: loadError } = await ctx.supabase
        .from("notes")
        .select("id, user_id, audio_path")
        .eq("id", noteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (loadError) throw new Error(`note_load_failed: ${loadError.message}`);
      if (!note) {
        return r.fail(
          404,
          "note_not_found",
          "Note missing or not owned by caller",
          {
            noteId,
          },
        );
      }

      if (note.audio_path) {
        const { error: storageError } = await serviceClient().storage
          .from("note-audio")
          .remove([note.audio_path]);
        if (storageError) {
          edgeLog("warn", SCOPE, {
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

      edgeLog("info", SCOPE, { event: "ok", noteId, durationMs: r.ms() });
      return Response.json({ ok: true, noteId });
    } catch (error) {
      return r.failFrom(error, "delete_failed", { noteId });
    }
  }),
};
