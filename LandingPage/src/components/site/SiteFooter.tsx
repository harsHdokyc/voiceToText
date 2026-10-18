import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { appUrl } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";
import {
  toWaitlistRow,
  waitlistSchema,
  waitlistStatusFromError,
} from "@/lib/waitlist";

const LINKS = [
  { to: "/product", label: "Product" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/early-access", label: "Early access" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { href: appUrl(), label: "Sign in" },
] as const;

type Status = "idle" | "loading" | "ok" | "already" | "error";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = waitlistSchema.safeParse({ email });
    if (!parsed.success) {
      setError(
        parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter your email.",
      );
      setStatus("error");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const { error: insertError } = await getSupabase()
        .from("waitlist")
        .insert(toWaitlistRow(parsed.data));
      if (!insertError) setStatus("ok");
      else
        setStatus(
          waitlistStatusFromError(insertError) === "already"
            ? "already"
            : "error",
        );
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-shell">
        <div className="container-site site-footer-cta">
          <div>
            <p className="site-footer-kicker">Stay in the loop</p>
            <h2 className="site-footer-title">
              Get early access when{" "}
              <span className="text-lime italic">Saydo</span> opens.
            </h2>
          </div>

          {status === "ok" || status === "already" ? (
            <p className="site-footer-done" role="status">
              {status === "ok"
                ? "You're on the list. We'll write when it's your turn."
                : "You're already on the list."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="site-footer-form"
              noValidate
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-label="Email for early access"
                className="site-footer-input"
              />
              <button
                type="submit"
                className="site-footer-submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join the list <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              {status === "error" ? (
                <p role="alert" className="site-footer-form-error">
                  {error || "Couldn't add you — try again in a moment."}
                </p>
              ) : (
                <p className="site-footer-form-hint">
                  No spam. Only when there's something to try.
                </p>
              )}
            </form>
          )}
        </div>

        <nav aria-label="Footer" className="container-site site-footer-nav">
          {LINKS.map((l) =>
            "href" in l && l.href ? (
              <a key={l.label} href={l.href} className="site-footer-link">
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={"to" in l ? l.to : "/"}
                className="site-footer-link"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="site-footer-marquee" aria-hidden>
          <div className="site-footer-marquee-track">
            <span>Say it · Get it done</span>
            <span aria-hidden>·</span>
            <span>AI proposes · You decide</span>
            <span aria-hidden>·</span>
            <span>Say it · Get it done</span>
            <span aria-hidden>·</span>
            <span>AI proposes · You decide</span>
            <span aria-hidden>·</span>
          </div>
        </div>

        <div className="site-footer-giant-wrap">
          <div className="site-footer-badge" aria-hidden>
            <svg viewBox="0 0 120 120" className="site-footer-badge-spin">
              <defs>
                <path
                  id="saydo-ring"
                  d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
                />
              </defs>
              <circle cx="60" cy="60" r="58" fill="var(--lime)" />
              <text className="site-footer-badge-text">
                <textPath href="#saydo-ring" startOffset="0%">
                  SAYDO · SAY IT · GET IT DONE · SAYDO · SAY IT · GET IT DONE ·
                </textPath>
              </text>
            </svg>
            <img
              src="/saydo-mark.svg"
              alt=""
              className="site-footer-badge-mark"
            />
          </div>
          <p className="site-footer-giant">SAYDO</p>
        </div>

        <div className="container-site site-footer-bar">
          <span>© {new Date().getFullYear()} Saydo</span>
          <span className="eyebrow text-lime/80">In early access</span>
        </div>
      </div>
    </footer>
  );
}
