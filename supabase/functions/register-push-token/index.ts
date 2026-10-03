import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeLog } from "../_shared/log.ts";

/**
 * Upsert Expo push token for the authenticated user.
 * Body: { token: string, platform?: 'ios'|'android'|'web' }
 */
export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const userId = ctx.userClaims?.id;
    if (!userId) {
      edgeLog("error", "edge.register-push-token", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing user claims",
      });
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      platform?: "ios" | "android" | "web";
    };
    const token = body.token?.trim();
    if (!token || token.length < 20 || token.length > 4096) {
      edgeLog("error", "edge.register-push-token", {
        event: "fail",
        code: "token_required",
        reason: "Body.token missing or invalid length",
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: "token_required" }, {
        status: 400,
      });
    }

    const platform = body.platform ?? "ios";
    if (!["ios", "android", "web"].includes(platform)) {
      return Response.json({ ok: false, error: "invalid_platform" }, {
        status: 400,
      });
    }

    edgeLog("info", "edge.register-push-token", {
      event: "start",
      platform,
    });

    try {
      const { error } = await ctx.supabase.from("device_tokens").upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "expo_push_token" },
      );
      if (error) throw new Error(`token_upsert_failed: ${error.message}`);

      edgeLog("info", "edge.register-push-token", {
        event: "ok",
        platform,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: true });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "register_failed";
      const code = reason.split(":")[0]?.trim() || "register_failed";
      edgeLog("error", "edge.register-push-token", {
        event: "fail",
        code,
        reason,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: code, reason }, { status: 502 });
    }
  }),
};
