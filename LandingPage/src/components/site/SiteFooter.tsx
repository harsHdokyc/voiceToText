import { Link } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { appUrl } from "@/lib/env";

const COLS = [
  {
    title: "Product",
    links: [
      { to: "/product", label: "Product", external: false },
      { to: "/how-it-works", label: "How it works", external: false },
      { to: "/pricing", label: "Pricing", external: false },
      { to: "/faq", label: "FAQ", external: false },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About", external: false },
      { to: "/early-access", label: "Early access", external: false },
      { to: "sign-in-app", label: "Sign in", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy", external: false },
      { to: "/terms", label: "Terms", external: false },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="surface-ink">
      <div className="container-site grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark className="text-2xl" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Say it. Get it done.<br />Your thoughts, turned into next steps.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="md:col-span-2">
            <p className="eyebrow text-muted-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.to}>
                  {l.external ? (
                    <a href={appUrl()} className="text-sm text-foreground/80 hover:text-lime">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.to} className="text-sm text-foreground/80 hover:text-lime">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-site flex flex-col justify-between gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} Saydo. In early access.</span>
        <span className="eyebrow">AI proposes. You decide.</span>
      </div>
    </footer>
  );
}
