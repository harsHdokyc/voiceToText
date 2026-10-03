import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { edgeLog } from "../_shared/log.ts";
import { MAX_REMINDER_ATTEMPTS } from "../_shared/reminders/constants.ts";

type ReminderRow = {
  id: string;
  user_id: string;
  task_id: string;
  attempt_count: number;
};

/**
 * Cron-invoked dispatcher. Auth: header x-cron-secret === CRON_SECRET.
 * Claims due reminders, sends Expo push best-effort, writes delivery ledger.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const started = Date.now();
    const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
    const provided = req.headers.get("x-cron-secret")?.trim();
    if (!cronSecret || !provided || provided !== cronSecret) {
      edgeLog("error", "edge.dispatch-reminders", {
        event: "fail",
        code: "unauthorized",
        reason: "Missing or invalid x-cron-secret",
      });
      return Response.json({ ok: false, error: "unauthorized" }, {
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("SB_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SB_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      edgeLog("error", "edge.dispatch-reminders", {
        event: "fail",
        code: "misconfigured",
        reason: "Missing SUPABASE_URL or service role key",
      });
      return Response.json({ ok: false, error: "misconfigured" }, {
        status: 500,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    edgeLog("info", "edge.dispatch-reminders", { event: "start" });

    try {
      const { data: claimed, error: claimError } = await admin.rpc(
        "claim_due_reminders",
        { p_limit: 25 },
      );
      if (claimError) {
        throw new Error(`claim_failed: ${claimError.message}`);
      }

      const reminders = (claimed ?? []) as ReminderRow[];
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const reminder of reminders) {
        const result = await dispatchOne(admin, reminder);
        if (result === "sent") sent += 1;
        else if (result === "failed") failed += 1;
        else skipped += 1;
      }

      edgeLog("info", "edge.dispatch-reminders", {
        event: "ok",
        claimed: reminders.length,
        sent,
        failed,
        skipped,
        durationMs: Date.now() - started,
      });

      return Response.json({
        ok: true,
        claimed: reminders.length,
        sent,
        failed,
        skipped,
      });
    } catch (error) {
      const reason = error instanceof Error
        ? error.message.slice(0, 200)
        : "dispatch_failed";
      const code = reason.split(":")[0]?.trim() || "dispatch_failed";
      edgeLog("error", "edge.dispatch-reminders", {
        event: "fail",
        code,
        reason,
        durationMs: Date.now() - started,
      });
      return Response.json({ ok: false, error: code, reason }, { status: 502 });
    }
  },
};

async function dispatchOne(
  admin: ReturnType<typeof createClient>,
  reminder: ReminderRow,
): Promise<"sent" | "failed" | "skipped"> {
  const attempt = reminder.attempt_count;

  const { data: task } = await admin
    .from("tasks")
    .select("id, title, status, user_id")
    .eq("id", reminder.task_id)
    .maybeSingle();

  if (!task || task.user_id !== reminder.user_id || task.status !== "open") {
    await admin.from("notification_deliveries").upsert(
      {
        user_id: reminder.user_id,
        reminder_id: reminder.id,
        channel: "push",
        status: "skipped",
        attempt_number: attempt,
        error_code: "task_not_open",
      },
      { onConflict: "reminder_id,channel,attempt_number" },
    );
    await admin
      .from("reminders")
      .update({
        status: "cancelled",
        last_error_code: "task_not_open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminder.id)
      .eq("status", "claimed");
    return "skipped";
  }

  const { data: tokens } = await admin
    .from("device_tokens")
    .select("expo_push_token")
    .eq("user_id", reminder.user_id);

  if (!tokens?.length) {
    await recordDelivery(admin, reminder, attempt, "skipped", null, "no_tokens");
    await finalizeReminder(admin, reminder.id, "failed", "no_tokens", attempt);
    return "failed";
  }

  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    title: "Task reminder",
    body: task.title.slice(0, 120),
    data: { taskId: task.id, reminderId: reminder.id },
  }));

  let providerId: string | null = null;
  let pushOk = false;
  let errorCode: string | null = null;

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null) as {
      data?: Array<{ id?: string; status?: string; message?: string }>;
    } | null;
    if (!res.ok) {
      errorCode = `expo_http_${res.status}`;
    } else {
      const first = json?.data?.[0];
      providerId = first?.id ?? null;
      pushOk = first?.status !== "error";
      if (!pushOk) errorCode = "expo_ticket_error";
    }
  } catch {
    errorCode = "expo_network_error";
  }

  if (pushOk) {
    await recordDelivery(
      admin,
      reminder,
      attempt,
      "accepted",
      providerId,
      null,
    );
    await finalizeReminder(admin, reminder.id, "sent", null, attempt);
    return "sent";
  }

  await recordDelivery(
    admin,
    reminder,
    attempt,
    "failed",
    providerId,
    errorCode,
  );

  const terminal = attempt >= MAX_REMINDER_ATTEMPTS;
  await finalizeReminder(
    admin,
    reminder.id,
    terminal ? "failed" : "scheduled",
    errorCode,
    attempt,
  );
  return "failed";
}

async function recordDelivery(
  admin: ReturnType<typeof createClient>,
  reminder: ReminderRow,
  attempt: number,
  status: "accepted" | "failed" | "skipped",
  providerMessageId: string | null,
  errorCode: string | null,
) {
  await admin.from("notification_deliveries").upsert(
    {
      user_id: reminder.user_id,
      reminder_id: reminder.id,
      channel: "push",
      status,
      attempt_number: attempt,
      provider_message_id: providerMessageId,
      error_code: errorCode,
    },
    { onConflict: "reminder_id,channel,attempt_number" },
  );
}

async function finalizeReminder(
  admin: ReturnType<typeof createClient>,
  reminderId: string,
  status: "sent" | "failed" | "scheduled" | "cancelled",
  lastErrorCode: string | null,
  _attempt: number,
) {
  const patch: Record<string, unknown> = {
    status,
    last_error_code: lastErrorCode,
    updated_at: new Date().toISOString(),
  };
  if (status === "sent") patch.sent_at = new Date().toISOString();
  // Reschedule for retry in 5 minutes when returning to scheduled.
  if (status === "scheduled") {
    patch.scheduled_for = new Date(Date.now() + 5 * 60_000).toISOString();
  }
  await admin.from("reminders").update(patch).eq("id", reminderId).eq(
    "status",
    "claimed",
  );
}
