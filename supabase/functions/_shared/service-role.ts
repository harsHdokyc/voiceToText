import { createClient } from "npm:@supabase/supabase-js@2.49.1";

/** Service-role client. Server-only; never return its data unfiltered to a caller. */
export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("misconfigured: missing SUPABASE_URL or service role key");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServiceClient = ReturnType<typeof serviceClient>;

/** Cron callers send `x-cron-secret: <CRON_SECRET>`. Missing secret = deny. */
export function hasCronSecret(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET")?.trim();
  const provided = req.headers.get("x-cron-secret")?.trim();
  return Boolean(expected && provided && provided === expected);
}
