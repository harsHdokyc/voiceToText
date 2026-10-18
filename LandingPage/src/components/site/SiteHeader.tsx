import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/utils";
import { appUrl } from "@/lib/config";

const NAV = [
  { to: "/product", label: "Product" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
] as const;

function EarlyAccessLink({ className }: { className?: string }) {
  return (
    <Link to="/early-access" className={cn("site-nav-cta group", className)}>
      Get early access
      <span className="site-nav-cta-arrow" aria-hidden>
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-50 pt-3 md:pt-4",
        open && "bg-background",
      )}
    >
      <div className="container-site">
        <div className="site-nav-pill relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 lg:flex lg:justify-between lg:gap-4">
          <Wordmark className="pl-1" />

          <nav
            aria-label="Main"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 lg:flex"
          >
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn("site-nav-link", isActive && "site-nav-link-active")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 pr-0.5 lg:flex">
            <a href={appUrl()} className="site-nav-signin">
              Sign in
            </a>
            <EarlyAccessLink />
          </div>

          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div data-lenis-prevent className="container-site flex h-[calc(100dvh-5.5rem)] flex-col justify-between gap-6 overflow-y-auto pb-6 pt-6 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((n, i) => (
              <Link
                key={n.to}
                to={n.to}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border py-4 font-display text-3xl sm:text-4xl"
              >
                {n.label}
                <span className="eyebrow text-muted-foreground">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3">
            <EarlyAccessLink className="site-nav-cta-mobile" />
            <a
              href={appUrl()}
              className="py-2 text-center text-sm text-muted-foreground"
            >
              Sign in
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
