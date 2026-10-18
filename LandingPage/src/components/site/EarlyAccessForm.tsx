import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import {
  toWaitlistRow,
  waitlistSchema,
  waitlistStatusFromError,
} from "@/lib/waitlist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "already" | "error";

export function EarlyAccessForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; firstName?: string }>(
    {},
  );
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = waitlistSchema.safeParse({
      email,
      firstName: firstName || undefined,
    });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ email: fe.email?.[0], firstName: fe.firstName?.[0] });
      return;
    }
    setErrors({});
    setStatus("loading");
    try {
      const { error } = await getSupabase()
        .from("waitlist")
        .insert(toWaitlistRow(parsed.data));
      setStatus(error ? waitlistStatusFromError(error) : "success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success" || status === "already") {
    return (
      <div
        className="rounded-2xl bg-foreground p-6 text-background shadow-lift"
        role="status"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="eyebrow text-background/60">Task · approved</span>
        </div>
        <p className="mt-4 font-display text-2xl tracking-[-0.03em]">
          {status === "success"
            ? `You're on the list${firstName.trim() ? `, ${firstName.trim()}` : ""}.`
            : "You're already on the list."}
        </p>
        <p className="mt-2 text-sm text-background/65">
          We'll email {email.trim()} when there's something for you to try. No
          spam in between.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-[1fr_1.4fr]")}>
        <label className="block">
          <span className="eyebrow mb-2 flex justify-between text-muted-foreground">
            First name <span className="opacity-60">Optional</span>
          </span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="input-field"
            placeholder="Maya"
          />
          {errors.firstName ? (
            <span className="mt-1.5 block text-sm text-destructive">
              {errors.firstName}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={cn("input-field", errors.email && "border-destructive")}
            placeholder="you@example.com"
          />
          {errors.email ? (
            <span className="mt-1.5 block text-sm text-destructive">
              {errors.email}
            </span>
          ) : null}
        </label>
      </div>
      <Button
        type="submit"
        variant="cta"
        size="xl"
        className="w-full sm:w-auto"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="animate-spin" /> Adding you…
          </>
        ) : (
          <>
            Get early access <span className="arrow">→</span>
          </>
        )}
      </Button>
      {status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong and you weren't added. Please try again in a
          moment.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        We'll only use your email to contact you about early access. Unsubscribe
        any time.
      </p>
    </form>
  );
}
