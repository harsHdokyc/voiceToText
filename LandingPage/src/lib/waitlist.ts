import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("That doesn't look like a valid email.")
    .max(255),
  firstName: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

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
