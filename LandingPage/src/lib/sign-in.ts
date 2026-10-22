import { emailSchema } from "./waitlist";

export type SignInMode = "signin" | "signup" | "reset";

/** First validation message for the sign-in form, or null when it can submit. */
export function signInError(
  mode: SignInMode,
  fields: { email: string; password: string; name: string },
): string | null {
  const email = emailSchema.safeParse(fields.email);
  if (!email.success) return email.error.issues[0]?.message ?? "Enter a valid email address.";
  if (mode !== "reset" && fields.password.length < 8) return "Enter a password with at least 8 characters.";
  if (mode === "signup" && !fields.name.trim()) return "Enter your name.";
  return null;
}
