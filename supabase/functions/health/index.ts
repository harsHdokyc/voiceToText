import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    return Response.json({
      ok: true,
      service: "voice-to-work",
      phase: 0,
      userId: ctx.userClaims?.id ?? null,
    });
  }),
};
