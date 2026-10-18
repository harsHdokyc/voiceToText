import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LineReveal, Reveal, SectionLabel } from "./Reveal";

export function PageIntro({
  label,
  lines,
  lead,
  aside,
}: {
  label: string;
  lines: ReactNode[];
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="container-site pb-16 pt-14 md:pb-24 md:pt-24">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-8 grid gap-10 md:grid-cols-12 md:items-end">
        <LineReveal as="h1" lines={lines} className="display-lg md:col-span-8" />
        {(lead || aside) && (
          <Reveal delay={0.2} className="md:col-span-4">
            {lead && <p className="text-lg leading-relaxed text-muted-foreground">{lead}</p>}
            {aside}
          </Reveal>
        )}
      </div>
    </section>
  );
}

export function CTABand({ title = "Make something happen with that thought." }: { title?: string }) {
  return (
    <section className="surface-cobalt overflow-hidden">
      <div className="container-site py-16 md:py-24">
        <div className="flex items-center gap-4 pb-5">
          <span className="eyebrow">The next step</span>
          <span className="h-px flex-1 bg-foreground/30" />
          <span className="font-mono text-xs">↗</span>
        </div>
        <div className="grid gap-10 pt-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <h2 className="max-w-4xl font-display text-[clamp(2.8rem,5.5vw,5.5rem)] font-medium leading-[1.03]">{title}</h2>
          <Button asChild variant="lime" size="xl">
            <Link to="/early-access">
              Get early access <span className="arrow">→</span>
            </Link>
          </Button>
        </div>
        <p className="mt-10 border-t border-border pt-5 text-sm text-foreground/75">Speak the thought. Keep the next step.</p>
      </div>
    </section>
  );
}

export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-foreground/40 bg-lime/40 p-4 text-sm">
      <span className="eyebrow shrink-0 pt-0.5">Draft</span>
      <p>{children}</p>
    </div>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-lavender px-1.5 py-0.5 font-mono text-[0.85em] text-ink">[{children}]</mark>;
}
