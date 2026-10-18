import { useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import {
  normalizeWaitlistInput,
  waitlistResultFromError,
  waitlistSchema,
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
      const row = normalizeWaitlistInput(parsed.data);
      const { error } = await getSupabase().from("waitlist").insert(row);
      if (!error) {
        setStatus("success");
        return;
      }
      const mapped = waitlistResultFromError(error);
      setStatus(mapped.status);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success" || status === "already") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
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
            ? `You're on the list${firstName ? `, ${firstName.trim()}` : ""}.`
            : "You're already on the list."}
        </p>
        <p className="mt-2 text-sm text-background/65">
          We'll email {email.trim()} when there's something for you to try. No
          spam in between.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-[1fr_1.4fr]")}>
        <Field label="First name" optional error={errors.firstName}>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="input-field"
            placeholder="Maya"
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={cn("input-field", errors.email && "border-destructive")}
            placeholder="you@example.com"
          />
        </Field>
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
      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong and you weren't added. Please try again in a
          moment.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        We'll only use your email to contact you about early access. Unsubscribe
        any time.
      </p>
    </form>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 flex justify-between text-muted-foreground">
        {label}
        {optional && <span className="opacity-60">Optional</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-sm text-destructive">{error}</span>
      )}
    </label>
  );
}
