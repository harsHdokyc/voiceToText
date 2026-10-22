import { Check, Mic, Square } from "lucide-react";
import { LineReveal, Reveal, SectionLabel } from "@/components/site/Reveal";
import { Waveform } from "@/components/site/Waveform";
import { SuggestionEditor } from "@/components/site/SuggestionEditor";
import { SAMPLE_LENGTH, SAMPLE_SUGGESTIONS } from "@/lib/content";

function Panel({ label, n, children, className = "" }: { label: string; n: string; children: React.ReactNode; className?: string }) {
  return (
    <Reveal className={className}>
      <figure className="flex h-full flex-col">
        <div className="flex-1 rounded-[1.4rem] border border-border bg-card p-5 shadow-card">{children}</div>
        <figcaption className="mt-3 flex items-baseline gap-3 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{n}</span>
          {label}
        </figcaption>
      </figure>
    </Reveal>
  );
}

export function Showcase() {
  return (
    <section className="container-site py-24 md:py-32">
      <div className="grid gap-8 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <SectionLabel index="03">The product</SectionLabel>
          <LineReveal lines={["Small surfaces.", "Clear decisions."]} className="display-lg mt-8" />
        </div>
        <p className="text-muted-foreground md:col-span-4 md:col-start-9">
          Four screens do the work: capture, read, review, follow through. Nothing else competes for your attention.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-12">
        <Panel n="A" label="Voice capture" className="md:col-span-4">
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-between py-4">
            <span className="eyebrow text-muted-foreground">Recording</span>
            <span className="font-display text-5xl tabular-nums tracking-[-0.04em]">0:08</span>
            <Waveform live className="h-12 w-full" progress={0.55} />
            <span className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-destructive-foreground">
              <Square className="h-5 w-5 fill-current" />
            </span>
          </div>
        </Panel>

        <Panel n="B" label="Transcript and extracted suggestions" className="md:col-span-8">
          <div className="grid h-full gap-5 sm:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="eyebrow text-muted-foreground">Transcript</span>
              <p className="mt-3 text-[0.95rem] leading-relaxed">
                Okay so after the call — <mark className="bg-lavender text-ink">email Jonas the revised timeline</mark>, he wanted it before
                the board pack. Also <mark className="bg-lavender text-ink">ask Priya about the venue deposit</mark>. Oh and I keep thinking the
                pricing page could just <mark className="bg-lavender text-ink">show one plan</mark>…
              </p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <span className="eyebrow text-muted-foreground">3 suggestions</span>
              <ul className="mt-3 space-y-2 text-sm">
                {["Email Jonas revised timeline", "Ask Priya about venue deposit", "Idea: single-plan pricing page"].map((t) => (
                  <li key={t} className="rounded-lg border border-dashed border-foreground/25 bg-card px-3 py-2">{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel n="C" label="Task review and approval" className="md:col-span-7">
          <div className="space-y-2">
            {[
              { t: "Email Jonas revised timeline", s: "approved" },
              { t: "Ask Priya about venue deposit", s: "pending" },
              { t: "Idea: single-plan pricing page", s: "rejected" },
            ].map((r) => (
              <div
                key={r.t}
                className={
                  r.s === "approved"
                    ? "flex items-center justify-between rounded-xl bg-foreground px-4 py-3 text-background"
                    : r.s === "pending"
                      ? "flex items-center justify-between rounded-xl border border-dashed border-foreground/30 px-4 py-3"
                      : "flex items-center justify-between rounded-xl px-4 py-3 text-muted-foreground line-through"
                }
              >
                <span className="text-sm font-medium">{r.t}</span>
                {r.s === "pending" ? (
                  <span className="flex gap-1.5">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs">Edit</span>
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground">Approve</span>
                  </span>
                ) : (
                  <span className="eyebrow">{r.s === "approved" ? "Task" : "Dismissed"}</span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel n="D" label="Task list with source-note context" className="md:col-span-5">
          <ul className="divide-y divide-border">
            {[
              { t: "Send revised proposal to Maya", due: "Thu", src: `Walk to the station · ${SAMPLE_LENGTH}` },
              { t: "Email Jonas revised timeline", due: "Today", src: "After the call · 0:52" },
              { t: "Book dentist appointment", src: `Walk to the station · ${SAMPLE_LENGTH}` },
            ].map((r) => (
              <li key={r.t} className="flex items-start gap-3 py-3 first:pt-0">
                <span className="mt-0.5 h-4 w-4 rounded-[5px] border-2 border-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.t}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Mic className="h-3 w-3" /> {r.src}
                  </p>
                </div>
                {r.due && <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-medium text-ink">{r.due}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

export function HumanControl() {
  return (
    <section className="bg-lavender text-ink">
      <div className="container-site grid gap-14 py-24 md:py-32 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionLabel index="04">Human control</SectionLabel>
          <LineReveal lines={["Your voice.", "Your decisions."]} className="display-lg mt-8" />
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink/70">
            Every suggestion stays pending — dashed, unchecked, clearly not yet real — until you act on it. Correct the wording, change the date,
            reject it, or simply leave it.
          </p>
          <ul className="mt-10 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="h-5 w-10 rounded-md border border-dashed border-ink/40" /> Suggestion — waiting on you
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-5 w-10 place-items-center rounded-md bg-ink text-lime">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              Task — you approved it
            </li>
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <p className="eyebrow text-ink/60 sm:col-span-2">Try it — these are live.</p>
          <SuggestionEditor suggestion={SAMPLE_SUGGESTIONS[0]!} />
          <div className="sm:mt-12">
            <SuggestionEditor suggestion={SAMPLE_SUGGESTIONS[2]!} />
          </div>
          <div className="sm:col-span-2 sm:w-1/2">
            <SuggestionEditor suggestion={SAMPLE_SUGGESTIONS[1]!} initial="approved" />
          </div>
        </div>
      </div>
    </section>
  );
}
