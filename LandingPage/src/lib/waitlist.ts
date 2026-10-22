import { z } from "zod";
import { getSupabase } from "./supabase";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("That doesn't look like a valid email.")
  .max(255);

export const waitlistSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type WaitlistRow = ReturnType<typeof toWaitlistRow>;

export function toWaitlistRow(input: WaitlistInput) {
  return {
    email: input.email.toLowerCase(),
    first_name: input.firstName?.trim() || null,
    source: "landing",
  };
}

/** Postgres unique violation → already on the list. */
export function waitlistStatusFromError(error: { code?: string }): "already" | "error" {
  return error.code === "23505" ? "already" : "error";
}

type InsertWaitlistRow = (
  row: WaitlistRow,
) => PromiseLike<{ error: { code?: string; message?: string } | null }>;

export type WaitlistResult =
  | { status: "success" | "already" }
  | { status: "invalid"; fieldErrors: { email?: string; firstName?: string } }
  | { status: "error"; code: string; reason: string };

const insertIntoSupabase: InsertWaitlistRow = (row) => getSupabase().from("waitlist").insert(row);

/** Validate, insert, and classify the outcome of one waitlist signup. */
export async function joinWaitlist(
  input: { email: string; firstName?: string },
  insert: InsertWaitlistRow = insertIntoSupabase,
): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse({ email: input.email, firstName: input.firstName || undefined });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return { status: "invalid", fieldErrors: { email: fe.email?.[0], firstName: fe.firstName?.[0] } };
  }
  let result: WaitlistResult;
  try {
    const { error } = await insert(toWaitlistRow(parsed.data));
    if (!error) return { status: "success" };
    if (waitlistStatusFromError(error) === "already") return { status: "already" };
    result = { status: "error", code: error.code ?? "waitlist_insert_failed", reason: error.message ?? "Insert failed" };
  } catch (e) {
    result = { status: "error", code: "waitlist_insert_threw", reason: e instanceof Error ? e.message : String(e) };
  }
  console.error(
    `[vtw]\n${JSON.stringify({ ts: new Date().toISOString(), src: "app", level: "error", scope: "waitlist", event: "join_failed", code: result.code, reason: result.reason }, null, 2)}`,
  );
  return result;
}
