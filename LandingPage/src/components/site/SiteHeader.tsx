import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appUrl } from "@/lib/env";

const NAV = [
  { to: "/product", label: "Product" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === "Tab") {
        const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>("a");
        const first = links?.[0];
        const last = links?.[links.length - 1];
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          triggerRef.current?.focus();
        }
        if (event.shiftKey && document.activeElement === triggerRef.current) {
          event.preventDefault();
          last?.focus();
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          triggerRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const media = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-50 pt-3 transition-[padding] duration-300 md:pt-4",
        open && "bg-background",
      )}
    >
      <div className="container-site">
        <motion.div
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "site-nav-pill relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 lg:flex lg:justify-between lg:gap-4 lg:px-3 lg:py-2",
            scrolled && "site-nav-pill-scrolled",
          )}
        >
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
            <Link to="/early-access" className="site-nav-cta group">
              Get early access
              <span className="site-nav-cta-arrow" aria-hidden>
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border border-ink/15 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </motion.div>
      </div>

      {open && (
        <div
          ref={menuRef}
          className="container-site flex h-[calc(100dvh-5.5rem)] flex-col justify-between gap-6 overflow-y-auto pb-6 pt-6 lg:hidden"
        >
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
            <Link to="/early-access" className="site-nav-cta site-nav-cta-mobile group">
              Get early access
              <span className="site-nav-cta-arrow" aria-hidden>
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
            <a
              href={appUrl()}
              className="py-2 text-center text-sm text-muted-foreground"
            >
              Sign in
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
