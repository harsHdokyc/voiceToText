import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { edgeRequest } from "../_shared/http.ts";
import { edgeLog } from "../_shared/log.ts";

const SCOPE = "edge.register-push-token";

/**
 * Upsert Expo push token for the authenticated user.
 * Body: { token: string, platform?: 'ios'|'android'|'web' }
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
      token?: string;
      platform?: "ios" | "android" | "web";
    };
    const token = body.token?.trim();
    if (!token || token.length < 20 || token.length > 4096) {
      return r.fail(
        400,
        "token_required",
        "Body.token missing or invalid length",
      );
    }

    const platform = body.platform ?? "ios";
    if (!["ios", "android", "web"].includes(platform)) {
      return r.fail(400, "invalid_platform", `platform=${platform}`);
    }

    edgeLog("info", SCOPE, { event: "start", platform });

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

      edgeLog("info", SCOPE, { event: "ok", platform, durationMs: r.ms() });
      return Response.json({ ok: true });
    } catch (error) {
      return r.failFrom(error, "register_failed");
    }
  }),
};
