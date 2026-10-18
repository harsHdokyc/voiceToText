import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
        "site-header sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled || open
          ? "border-b border-border bg-background/85 backdrop-blur-md"
          : "border-b border-border bg-background",
      )}
    >
      <div className="container-site grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:flex lg:h-20 lg:justify-between">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "relative rounded-md px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  <span
                    className={cn(
                      "absolute bottom-0 left-4 h-[2px] w-[calc(100%_-_2rem)] origin-left bg-primary transition-transform duration-500",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          <Button asChild variant="ghost">
            <a href={appUrl()}>Sign in</a>
          </Button>
          <Button asChild variant="ink" className="h-11 px-5">
            <Link to="/early-access">
              Get early access <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="-mr-2 h-11 w-11 shrink-0 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div
          ref={menuRef}
          className="container-site flex h-[calc(100dvh-4rem)] flex-col justify-between gap-6 overflow-y-auto pb-6 pt-4 lg:hidden"
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
            <Button asChild variant="cta" size="xl">
              <Link to="/early-access">
                Get early access <span className="arrow">→</span>
              </Link>
            </Button>
            <a href={appUrl()} className="py-2 text-center text-sm text-muted-foreground">
              Sign in
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
