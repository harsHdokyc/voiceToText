import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("That doesn't look like a valid email.")
    .max(255),
  firstName: z
    .string()
    .trim()
    .max(80, "Keep it under 80 characters.")
    .optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export type WaitlistSubmitResult =
  | { ok: true; status: "success" }
  | { ok: true; status: "already" }
  | { ok: false; status: "error"; reason: string };

export function normalizeWaitlistInput(input: WaitlistInput): {
  email: string;
  first_name: string | null;
  source: string;
} {
  return {
    email: input.email.toLowerCase(),
    first_name: input.firstName?.trim() ? input.firstName.trim() : null,
    source: "landing",
  };
}

/** Map PostgREST / Postgres errors to waitlist UI outcomes. */
export function waitlistResultFromError(error: {
  code?: string;
  message?: string;
}): WaitlistSubmitResult {
  if (error.code === "23505") {
    return { ok: true, status: "already" };
  }
  return {
    ok: false,
    status: "error",
    reason: error.message?.trim() || "insert_failed",
  };
}
